/* ==========================================================================
   活用ネオン ― 古文助動詞活用表パズル
   script.js

   ここでは以下を行っています。
   1. 活用表データ（6種類）とダミー語の定義
   2. 盤面のシャッフル生成
   3. クリック（タップ）／ドラッグ＆ドロップによるマス入れ替え
   4. 行ごとの正誤判定・ロック演出
   5. スコア・コンボ・タイマー・クリア判定
   ========================================================================== */

/* ------------------------------------------------------------------------
   1. データ定義
   ------------------------------------------------------------------------ */

// 活用形の列名（常に左からこの順番で表示する）
const KEI_LABELS = ["未然形", "連用形", "終止形", "連体形", "已然形", "命令形"];

// 色ヒントに使うグループカラー（CSS変数名）。今のところ6色しか用意していないため、
// PATTERNSの数がそれより多くても表示が壊れないよう、順番に使い回す(cycleさせる)。
const GROUP_COLOR_VARS = [
  "--grp-blue",
  "--grp-purple",
  "--grp-red",
  "--grp-green",
  "--grp-yellow",
  "--grp-cyan",
];



// ---------------------------------------------------------------------
// 全助動詞（＋動詞活用の例）データベース。
// ここに何種類登録してもよい（20種類以上になっても動作する設計）。
// forms は [未然,連用,終止,連体,已然,命令] の順。存在しない活用形は "○"。
// colorVar は GROUP_COLOR_VARS を順番に割り当てているだけなので、
// 件数が増えても自動的に使い回される。
// ---------------------------------------------------------------------
const PATTERN_SOURCE = [
  { id: "ki",         name: "過去の助動詞「き」",         forms: ["せ", "○", "き", "し", "しか", "○"] },
  { id: "keri",       name: "詠嘆の助動詞「けり」",       forms: ["○", "○", "けり", "ける", "けれ", "○"] },
  { id: "zu",         name: "打消の助動詞「ず」",         forms: ["ず", "ず", "ず", "ぬ", "ね", "ざれ"] },
  { id: "mu",         name: "推量の助動詞「む」",         forms: ["○", "○", "む", "む", "め", "○"] },
  { id: "tari-kanryo",name: "完了の助動詞「たり」",       forms: ["たら", "たり", "たり", "たる", "たれ", "たれ"] },
  { id: "kaku",       name: "四段活用「書く」",           forms: ["か", "き", "く", "く", "け", "け"] },
  { id: "tsu",        name: "完了の助動詞「つ」",         forms: ["て", "て", "つ", "つる", "つれ", "てよ"] },
  { id: "nu-kanryo",  name: "完了の助動詞「ぬ」",         forms: ["な", "に", "ぬ", "ぬる", "ぬれ", "ね"] },
  { id: "kemu",       name: "過去推量の助動詞「けむ」",   forms: ["○", "○", "けむ", "けむ", "けめ", "○"] },
  { id: "ramu",       name: "現在推量の助動詞「らむ」",   forms: ["○", "○", "らむ", "らむ", "らめ", "○"] },
  { id: "beshi",      name: "推量の助動詞「べし」",       forms: ["べく", "べく", "べし", "べき", "べけれ", "○"] },
  { id: "maji",       name: "打消推量の助動詞「まじ」",   forms: ["まじく", "まじく", "まじ", "まじき", "まじけれ", "○"] },
  { id: "mashi",      name: "反実仮想の助動詞「まし」",   forms: ["ませ", "○", "まし", "まし", "ましか", "○"] },
  { id: "meri",       name: "推定の助動詞「めり」",       forms: ["○", "めり", "めり", "める", "めれ", "○"] },
  { id: "nari-denbun",name: "伝聞推定の助動詞「なり」",   forms: ["○", "なり", "なり", "なる", "なれ", "○"] },
  { id: "nari-dantei",name: "断定の助動詞「なり」",       forms: ["なら", "なり", "なり", "なる", "なれ", "なれ"] },
  { id: "gotoshi",    name: "比況の助動詞「ごとし」",     forms: ["ごとく", "ごとく", "ごとし", "ごとき", "○", "○"] },
  { id: "tashi",      name: "希望の助動詞「たし」",       forms: ["たく", "たく", "たし", "たき", "たけれ", "○"] },
  { id: "ru-jido",    name: "受身・自発の助動詞「る」",   forms: ["れ", "れ", "る", "るる", "るれ", "れよ"] },
  { id: "sasu-shieki",name: "使役の助動詞「さす」",       forms: ["させ", "させ", "さす", "さする", "さすれ", "させよ"] },
];

// colorVar をここで自動的に割り当てる（PATTERN_SOURCEの並び順に対してcycleする）
const PATTERNS = PATTERN_SOURCE;

// 1回のゲームで出題するパターン数（この数を変えるだけで出題数を増減できる）
const PATTERN_SELECT_COUNT = 6;

// pool の中からランダムに count 件、重複なしで抽出する。
// シャッフルしてから先頭count件を取るだけなので、poolに同じidが無い限り重複しない。
function getRandomPatterns(pool, count) {
  return shuffleArray(pool).slice(0, count);
}

// 上級モードで混ぜるダミー語（どの活用表にも属さない偽物）
const DUMMY_WORDS = ["すら", "のみ", "こそ", "しも", "だに", "や"];

/* ------------------------------------------------------------------------
   2. ゲーム状態
   ------------------------------------------------------------------------ */

const state = {
  difficulty: "beginner", // beginner / intermediate / advanced
  selectedPatterns: [],   // 今回の出題で選ばれたパターン（ランダムにPATTERN_SELECT_COUNT件）
  rows: 6,                // 盤面の行数（selectedPatterns.length + 上級ならダミー行1行）
  cols: 6,
  cells: [],              // 盤面上の各マスのデータ（行優先の1次元配列）
  selectedIndex: null,    // クリック選択中のマスのインデックス
  lockedPatternIds: new Set(), // 完成済みパターンのid
  score: 0,
  combo: 0,
  startTime: null,
  timerHandle: null,
  elapsedSeconds: 0,
  isCleared: false,
};

/* ------------------------------------------------------------------------
   3. ユーティリティ
   ------------------------------------------------------------------------ */

// 配列をランダムにシャッフルする（Fisher–Yatesアルゴリズム）
function shuffleArray(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// 画面切り替え関数
// クラスの付け外しだけでなく、style.displayも直接書き換えることで
// 「CSSの読み込みタイミングやクラス指定ミスで画面が重なって表示される」
// 事故を確実に防ぐ（インラインstyleは外部CSSより優先されるため）。
const SCREEN_IDS = ["screen-title", "screen-game", "screen-clear"];

function showScreen(activeId) {
  SCREEN_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) {
      console.error(`[活用ネオン] 画面要素が見つかりません: #${id}`);
      return;
    }
    if (id === activeId) {
      el.classList.add("is-active");
      el.style.display = "flex";
    } else {
      el.classList.remove("is-active");
      el.style.display = "none";
    }
  });
}

function showToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.classList.remove("is-show");
  // 強制リフローしてアニメーションを再生させる
  void toast.offsetWidth;
  toast.classList.add("is-show");
}

/* ------------------------------------------------------------------------
   4. 盤面生成
   ------------------------------------------------------------------------ */

function buildDeck(difficulty, selectedPatterns) {
  const deck = [];

  // 出題対象として選ばれたパターンの分だけ「正解セット」を用意する
  // （選ばれた種類数 × 6マス）
  selectedPatterns.forEach((pattern, rowIndex) => {
    pattern.forms.forEach((value, colIndex) => {
      deck.push({
        value,
        patternId: pattern.id,
        colorVar: pattern.colorVar,
        correctRow: rowIndex,
        correctCol: colIndex,
        isDummy: false,
      });
    });
  });

  // 上級モードのみ：ダミー語を1行分（6マス）追加する
  if (difficulty === "advanced") {
    DUMMY_WORDS.forEach((value, colIndex) => {
      deck.push({
        value,
        patternId: null,
        colorVar: null,
        correctRow: -1,
        correctCol: colIndex,
        isDummy: true,
      });
    });
  }

  return deck;
}

function startGame(difficulty) {
  // PATTERNS（全助動詞データ）からランダムにPATTERN_SELECT_COUNT種類、重複なしで抽出する
  // ここが要件のコア部分：
  //   const selectedPatterns = getRandomPatterns(PATTERNS, 6);
 const selectedPatterns =
  getRandomPatterns(PATTERNS, PATTERN_SELECT_COUNT)
    .map((pattern, index) => ({
      ...pattern,
      colorVar: GROUP_COLOR_VARS[index]
    }));

  state.difficulty = difficulty;
  state.selectedPatterns = selectedPatterns;
  // 出題数(selectedPatterns.length)を基準に行数を決める。
  // → 将来PATTERN_SELECT_COUNTを増減させても、この行はそのまま動作する。
  state.rows = selectedPatterns.length + (difficulty === "advanced" ? 1 : 0);
  state.cols = 6;
  state.selectedIndex = null;
  state.lockedPatternIds = new Set();
  state.score = 0;
  state.combo = 0;
  state.elapsedSeconds = 0;
  state.isCleared = false;

  // 要件どおりの順番で処理する：
  // タイトル非表示→ゲーム表示 → 盤面シャッフル生成 → タイマー開始
  showScreen("screen-game");

  // シャッフルしたデッキを盤面マスへ割り当てる（選ばれたパターンのみで生成）
  const shuffled = shuffleArray(buildDeck(difficulty, selectedPatterns));
  state.cells = shuffled.map((data) => ({ ...data, locked: false }));

  updateHUD();
  renderHintLegend();
  renderBoard();
  startTimer();
}

/* ------------------------------------------------------------------------
   5. 盤面の描画
   ------------------------------------------------------------------------ */

function renderBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";

  // 難易度によってヒントの強さクラスを切り替える
  board.classList.remove("hint-strong", "hint-weak", "hint-none");
  if (state.difficulty === "beginner") board.classList.add("hint-strong");
  else if (state.difficulty === "intermediate") board.classList.add("hint-weak");
  else board.classList.add("hint-none");

  // 列見出し（未然形〜命令形）は常時表示
  KEI_LABELS.forEach((label) => {
    const head = document.createElement("div");
    head.className = "col-head";
    head.textContent = label;
    board.appendChild(head);
  });

  // マスを行優先の順で描画する
  state.cells.forEach((cell, index) => {
    const el = document.createElement("div");
    el.className = "cell";
    el.textContent = cell.value;
    el.dataset.index = String(index);
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", cell.value);

    if (cell.isDummy) {
      el.classList.add("is-dummy");
      el.dataset.group = "dummy";
    } else {
      el.dataset.group = cell.patternId;
      el.style.setProperty("--grp-color", `var(${cell.colorVar})`);
    }

    if (cell.locked) {
      el.classList.add("is-locked");
    } else {
      // ロックされていないマスだけ操作可能にする
      el.draggable = true;
      el.addEventListener("click", () => onCellClick(index));
      el.addEventListener("dragstart", (e) => onDragStart(e, index));
      el.addEventListener("dragover", (e) => onDragOver(e, index));
      el.addEventListener("dragleave", (e) => onDragLeave(e, index));
      el.addEventListener("drop", (e) => onDrop(e, index));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCellClick(index);
        }
      });
    }

    if (state.selectedIndex === index) {
      el.classList.add("is-selected");
    }

    board.appendChild(el);
  });
}

function renderHintLegend() {
  const legend = document.getElementById("hint-legend");
  legend.innerHTML = "";

  // 上級モードは色ヒントを一切出さない
  if (state.difficulty === "advanced") {
    legend.classList.add("is-hidden");
    return;
  }
  legend.classList.remove("is-hidden");

  // 凡例には「今回選ばれた6種類」だけを表示する
  state.selectedPatterns.forEach((pattern) => {
    const item = document.createElement("span");
    item.className = "legend-item";
    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = `var(${pattern.colorVar})`;
    dot.style.color = `var(${pattern.colorVar})`;
    item.appendChild(dot);
    item.appendChild(document.createTextNode(pattern.name.replace(/^.+「|」$/g, "")));
    legend.appendChild(item);
  });
}

/* ------------------------------------------------------------------------
   6. マスの選択・入れ替え（クリック／タップ）
   ------------------------------------------------------------------------ */

function onCellClick(index) {
  if (state.isCleared) return;

  if (state.selectedIndex === null) {
    state.selectedIndex = index;
    renderBoard();
    return;
  }

  if (state.selectedIndex === index) {
    // 同じマスをもう一度選んだら選択解除
    state.selectedIndex = null;
    renderBoard();
    return;
  }

  swapCells(state.selectedIndex, index);
  state.selectedIndex = null;
}

/* ------------------------------------------------------------------------
   7. ドラッグ＆ドロップ対応
   ------------------------------------------------------------------------ */

let dragSourceIndex = null;

function onDragStart(e, index) {
  dragSourceIndex = index;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", String(index));
}

function onDragOver(e, index) {
  e.preventDefault(); // これがないとdropが発火しない
  e.currentTarget.classList.add("is-dragover");
}

function onDragLeave(e) {
  e.currentTarget.classList.remove("is-dragover");
}

function onDrop(e, index) {
  e.preventDefault();
  e.currentTarget.classList.remove("is-dragover");
  if (dragSourceIndex === null || dragSourceIndex === index) return;
  swapCells(dragSourceIndex, index);
  dragSourceIndex = null;
  state.selectedIndex = null;
}

/* ------------------------------------------------------------------------
   8. マス入れ替え本体と判定
   ------------------------------------------------------------------------ */

function swapCells(indexA, indexB) {
  const a = state.cells[indexA];
  const b = state.cells[indexB];
  if (a.locked || b.locked) return; // ロック済みマスは動かせない

  [state.cells[indexA], state.cells[indexB]] = [b, a];

  // 入れ替えに関わった2つの行を判定する（同じ行同士の交換なら1つだけ）
  const rowA = Math.floor(indexA / state.cols);
  const rowB = Math.floor(indexB / state.cols);
  const rowsToCheck = Array.from(new Set([rowA, rowB]));

  const newlyCompleted = [];
  rowsToCheck.forEach((row) => {
    const pattern = checkRowCompletion(row);
    if (pattern) newlyCompleted.push({ row, pattern });
  });

  if (newlyCompleted.length > 0) {
    newlyCompleted.forEach(({ row, pattern }) => applyRowClear(row, pattern));
  } else {
    // 揃わなかった入れ替えはコンボを途切れさせる
    state.combo = 0;
  }

  updateHUD();
  renderBoard();

  // クリア条件は「PATTERNS全件」ではなく「今回選ばれたselectedPatterns」を完成させること
  if (state.lockedPatternIds.size >= state.selectedPatterns.length) {
    finishGame();
  }
}

// 指定した行が、まだロックされていない完成パターンと完全一致するか判定する。
// 判定対象は state.selectedPatterns（今回抽出された6種類）のみに限定する。
function checkRowCompletion(row) {
  const start = row * state.cols;
  const rowCells = state.cells.slice(start, start + state.cols);

  const values = rowCells.map((c) => c.value);
  const matched = state.selectedPatterns.find(
    (p) => !state.lockedPatternIds.has(p.id) && p.forms.every((v, i) => v === values[i])
  );
  return matched || null;
}

function applyRowClear(row, pattern) {
  const start = row * state.cols;
  for (let c = 0; c < state.cols; c++) {
    state.cells[start + c].locked = true;
  }
  state.lockedPatternIds.add(pattern.id);

  // コンボ加算とスコア計算（1行目100点、以降50点ずつ増加）
  state.combo += 1;
  const gained = 100 + (state.combo - 1) * 50;
  state.score += gained;

  showToast(`活用表完成！「${pattern.name}」 +${gained}点`);

  // 発光演出用に少し遅らせてクラスを付与（再描画後に光らせる）
  requestAnimationFrame(() => {
    const cellsEls = document.querySelectorAll(`.cell[data-group="${pattern.id}"]`);
    cellsEls.forEach((el) => el.classList.add("is-flash"));
  });
}

/* ------------------------------------------------------------------------
   9. HUD（スコア・コンボ・タイマー）更新
   ------------------------------------------------------------------------ */

function updateHUD() {
  document.getElementById("hud-score").textContent = state.score;
  document.getElementById("hud-combo").textContent = state.combo;
  document.getElementById("hud-cleared").textContent = state.lockedPatternIds.size;

  const comboWrap = document.getElementById("hud-combo-wrap");
  comboWrap.classList.toggle("is-hot", state.combo >= 2);

  // タイマー表示は中級・上級のみ（初級は非表示。内部では常に計測している）
  const timerWrap = document.getElementById("hud-timer-wrap");
  timerWrap.classList.toggle("is-hidden", state.difficulty === "beginner");
}

function startTimer() {
  stopTimer();
  state.startTime = Date.now();
  state.timerHandle = setInterval(() => {
    state.elapsedSeconds = (Date.now() - state.startTime) / 1000;
    document.getElementById("hud-timer").textContent = formatTime(state.elapsedSeconds);
  }, 250);
}

function stopTimer() {
  if (state.timerHandle) {
    clearInterval(state.timerHandle);
    state.timerHandle = null;
  }
}

/* ------------------------------------------------------------------------
   10. クリア判定・ランク計算
   ------------------------------------------------------------------------ */

function calcRank(seconds) {
  if (seconds <= 180) return "S";
  if (seconds <= 300) return "A";
  if (seconds <= 600) return "B";
  return "C";
}

function finishGame() {
  state.isCleared = true;
  stopTimer();

  const finalSeconds = state.elapsedSeconds;
  document.getElementById("clear-time").textContent = formatTime(finalSeconds);
  document.getElementById("clear-score").textContent = state.score;
  document.getElementById("clear-rows").textContent = `${state.lockedPatternIds.size} / ${state.selectedPatterns.length}`;
  document.getElementById("clear-rank").textContent = calcRank(finalSeconds);

  // 少し余韻を持たせてからクリア画面を表示
  setTimeout(() => showScreen("screen-clear"), 500);
}

/* ------------------------------------------------------------------------
   11. 桜の花びらエフェクト生成
   ------------------------------------------------------------------------ */

function spawnSakura() {
  const layer = document.getElementById("sakura-layer");
  const PETAL_COUNT = 22;

  for (let i = 0; i < PETAL_COUNT; i++) {
    const petal = document.createElement("div");
    petal.className = "petal";
    const size = 6 + Math.random() * 10;
    petal.style.width = `${size}px`;
    petal.style.height = `${size}px`;
    petal.style.left = `${Math.random() * 100}vw`;

    const fallDuration = 8 + Math.random() * 10;
    const swayDuration = 3 + Math.random() * 3;
    const delay = Math.random() * 10;
    petal.style.animationDuration = `${fallDuration}s, ${swayDuration}s`;
    petal.style.animationDelay = `${-delay}s, ${-delay}s`;

    layer.appendChild(petal);
  }
}

/* ------------------------------------------------------------------------
   12. 初期化・イベント登録
   ------------------------------------------------------------------------ */

function init() {
  // ① 起動時は必ずタイトル画面だけを表示する（ゲーム画面・クリア画面は非表示）
  //    HTML側のclass指定に頼らず、ここで明示的に状態を確定させる。
  showScreen("screen-title");

  spawnSakura();

  // ② 難易度ボタン：初級／中級／上級のどれを押しても同じ流れでゲーム開始
  //    （タイトル非表示→ゲーム表示→盤面シャッフル生成→タイマー開始 は
  //     すべてstartGame()の中でshowScreen()経由・一括して行う）
  const diffButtons = document.querySelectorAll(".diff-btn");
  if (diffButtons.length === 0) {
    console.error("[活用ネオン] 難易度ボタン(.diff-btn)が見つかりません。");
  }
  diffButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const difficulty = btn.dataset.difficulty;
      if (!difficulty) {
        console.error("[活用ネオン] data-difficulty が設定されていないボタンがあります。", btn);
        return;
      }
      startGame(difficulty);
    });
  });

  // ③ ゲーム画面からタイトルへ戻る
  const backBtn = document.getElementById("btn-back-title");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      stopTimer();
      showScreen("screen-title");
    });
  }

  // ④ クリア画面：もう一度遊ぶ
  const retryBtn = document.getElementById("btn-retry");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      startGame(state.difficulty);
    });
  }

  // ⑤ クリア画面：タイトルへ戻る
  const toTitleBtn = document.getElementById("btn-to-title");
  if (toTitleBtn) {
    toTitleBtn.addEventListener("click", () => {
      stopTimer();
      showScreen("screen-title");
    });
  }
}

// スクリプトを</body>直前（DOM要素の後）に配置しているため、
// 実行時点でDOMは既に構築済みのケースが多いが、
// 万一まだ読み込み中(readyState === "loading")の場合に備えて分岐しておく。
// こうすることで「DOMContentLoadedが発火するタイミングを逃してinit()が呼ばれない」
// という不具合を防ぐ。
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
