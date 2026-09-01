/* ==========================================================================
   雅ラン ― 古文助動詞活用表パズル
   script.js

   ここでは以下を行っています。
   1. 助動詞データベース（20種類以上）とダミー語の定義
   2. 出題パターンのランダム抽出・盤面のシャッフル生成
   3. クリック（タップ）／マウスドラッグ／指でのタッチドラッグによるマス入れ替え
   4. 行ごとの正誤判定・ロック演出（行灯の光で浮かび上がる演出）
   5. スコア・コンボ・タイマー・クリア判定
   6. 初級モード限定の「学習メモ」モーダル表示
   ========================================================================== */

/* ------------------------------------------------------------------------
   1. データ定義
   ------------------------------------------------------------------------ */

// 活用形の列名（常に左からこの順番で表示する）
const KEI_LABELS = ["未然形", "連用形", "終止形", "連体形", "已然形", "命令形"];

// 出題された6種類に対して「1番目=青,2番目=紫,3番目=赤,4番目=緑,5番目=黄,6番目=水色」を
// 助動詞の種類に関わらず毎回固定で割り当てるための色リスト（CSS変数名）。
// 助動詞ID(patternId)には一切紐づけない＝ここが色システムの核心。
//
// 初級と中級では「色相の並び順（青→紫→赤→緑→黄→水色）」は同じだが、
// 中級は彩度・明度を寄せて少し見分けにくくした配色(*-mid)を使うことで、
// ヒントとしての難易度を上げている（ただし色相自体は変えていないため、
// 色覚特性のあるユーザーの手がかりを完全には奪わないよう配慮している）。
const ROW_COLOR_VARS_BY_DIFFICULTY = {
  beginner: ["--grp-blue", "--grp-purple", "--grp-red", "--grp-green", "--grp-yellow", "--grp-cyan"],
  intermediate: ["--grp-blue-mid", "--grp-purple-mid", "--grp-red-mid", "--grp-green-mid", "--grp-yellow-mid", "--grp-cyan-mid"],
  // 上級は色ヒント自体を表示しないため、どちらでも見た目には影響しない（初級用を流用）
  advanced: ["--grp-blue", "--grp-purple", "--grp-red", "--grp-green", "--grp-yellow", "--grp-cyan"],
};

function getRowColorVars(difficulty) {
  return ROW_COLOR_VARS_BY_DIFFICULTY[difficulty] || ROW_COLOR_VARS_BY_DIFFICULTY.beginner;
}



// ---------------------------------------------------------------------
// 全助動詞（＋動詞活用の例）データベース。
// ここに何種類登録してもよい（20種類以上になっても動作する設計）。
// forms は [未然,連用,終止,連体,已然,命令] の順。存在しない活用形は "○"。
// meaning（意味）・connection（接続）は初級モードの学習メモで使用する。
// なお色(colorVar)はここでは持たせない。出題順（何番目に選ばれたか）だけで
// 「青・紫・赤・緑・黄・水色」を割り当てるため、buildDeck() 側で決定する。
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// 【問題データ】盤面の生成・正誤判定にだけ使う最小限のデータ。
// id / name / forms 以外は持たせない（意味や解説は下の JODOUSHI_EXPLANATIONS 側で管理する）。
// ここに何種類登録してもよい（20種類以上になっても動作する設計）。
// forms は [未然,連用,終止,連体,已然,命令] の順。存在しない活用形は "○"。
// ---------------------------------------------------------------------
const PATTERN_SOURCE = [
  { id: "ki",          name: "過去の助動詞「き」",         forms: ["せ", "○", "き", "し", "しか", "○"] },
  { id: "keri",        name: "詠嘆の助動詞「けり」",       forms: ["○", "○", "けり", "ける", "けれ", "○"] },
  { id: "zu",          name: "打消の助動詞「ず」",         forms: ["ず", "ず", "ず", "ぬ", "ね", "ざれ"] },
  { id: "mu",          name: "推量の助動詞「む」",         forms: ["○", "○", "む", "む", "め", "○"] },
  { id: "tari-kanryo", name: "完了の助動詞「たり」",       forms: ["たら", "たり", "たり", "たる", "たれ", "たれ"] },
  { id: "kaku",        name: "四段活用「書く」",           forms: ["か", "き", "く", "く", "け", "け"] },
  { id: "tsu",         name: "完了の助動詞「つ」",         forms: ["て", "て", "つ", "つる", "つれ", "てよ"] },
  { id: "nu-kanryo",   name: "完了の助動詞「ぬ」",         forms: ["な", "に", "ぬ", "ぬる", "ぬれ", "ね"] },
  { id: "kemu",        name: "過去推量の助動詞「けむ」",   forms: ["○", "○", "けむ", "けむ", "けめ", "○"] },
  { id: "ramu",        name: "現在推量の助動詞「らむ」",   forms: ["○", "○", "らむ", "らむ", "らめ", "○"] },
  { id: "beshi",       name: "推量の助動詞「べし」",       forms: ["べく", "べく", "べし", "べき", "べけれ", "○"] },
  { id: "maji",        name: "打消推量の助動詞「まじ」",   forms: ["まじく", "まじく", "まじ", "まじき", "まじけれ", "○"] },
  { id: "mashi",       name: "反実仮想の助動詞「まし」",   forms: ["ませ", "○", "まし", "まし", "ましか", "○"] },
  { id: "meri",        name: "推定の助動詞「めり」",       forms: ["○", "めり", "めり", "める", "めれ", "○"] },
  { id: "nari-denbun", name: "伝聞推定の助動詞「なり」",   forms: ["○", "なり", "なり", "なる", "なれ", "○"] },
  { id: "nari-dantei", name: "断定の助動詞「なり」",       forms: ["なら", "なり", "なり", "なる", "なれ", "なれ"] },
  { id: "gotoshi",     name: "比況の助動詞「ごとし」",     forms: ["ごとく", "ごとく", "ごとし", "ごとき", "○", "○"] },
  { id: "tashi",       name: "希望の助動詞「たし」",       forms: ["たく", "たく", "たし", "たき", "たけれ", "○"] },
  { id: "ru-jido",     name: "受身・自発の助動詞「る」",   forms: ["れ", "れ", "る", "るる", "るれ", "れよ"] },
  { id: "sasu-shieki", name: "使役の助動詞「さす」",       forms: ["させ", "させ", "さす", "さする", "さすれ", "させよ"] },
];

// PATTERNSはもう色を持たない。PATTERN_SOURCEをそのまま使う。
const PATTERNS = PATTERN_SOURCE;

// ---------------------------------------------------------------------
// 【解説データ】学習メモモーダルの表示にだけ使うデータ。パズルの正誤判定には一切関与しない。
// PATTERN_SOURCE の id をキーにして紐づける（＝問題データと解説データを分離した管理方式）。
//
// 各エントリの形：
//   {
//     connection: "接続（未然形／連用形など）",
//     meanings:   ["意味1", "意味2", ...],   // 複数の意味を持つ語は全て列挙する
//     notes:      "識別のポイント（他の語との見分け方など）",
//     examples:   [{ sentence: "例文", note: "現代語訳・補足" }, ...],
//   }
//
// 【将来の拡張方針】
// 助詞・敬語・古文単語・文学史なども、同じ形の別レジストリ（例：JOSHI_EXPLANATIONS,
// KEIGO_EXPLANATIONS など）として追加していく想定。各モジュールの問題データも
// PATTERN_SOURCE と同じように「id / name / (そのモジュール固有の出題用データ)」
// だけを持たせ、意味・解説はこちら側のレジストリに分離しておくことで、
// 出題ロジックと解説内容を独立して拡張・修正できるようにしている。
// ---------------------------------------------------------------------
const JODOUSHI_EXPLANATIONS = {
  "ki": {
    connection: "用言の連用形",
    meanings: ["過去"],
    notes: "自分が直接体験した過去の出来事を回想して述べるときに使う。伝聞ではなく実体験である点が「けり」との違い。",
    examples: [{ sentence: "昨日、山に登りき。", note: "昨日、山に登った。（自分が実際に経験した過去）" }],
  },
  "keri": {
    connection: "用言の連用形",
    meanings: ["過去", "詠嘆"],
    notes: "地の文（物語の語り出しなど）では過去（伝聞）、会話文・和歌では詠嘆（〜だなあ）になりやすい。",
    examples: [{ sentence: "むかし、男ありけり。", note: "昔、（ある）男がいた。（物語の語り出しに多い「過去」の用法）" }],
  },
  "zu": {
    connection: "未然形",
    meanings: ["打消"],
    notes: "活用形によって「ず・ぬ・ね」など形が変わる。連体形「ぬ」・已然形「ね」は完了の助動詞「ぬ」と紛らわしいので接続で見分ける。",
    examples: [{ sentence: "花咲かず。", note: "花が咲かない。" }],
  },
  "mu": {
    connection: "未然形",
    meanings: ["推量", "意志", "適当", "勧誘", "仮定", "婉曲"],
    notes: "主語が一人称なら意志、二人称なら勧誘・適当、三人称なら推量になりやすい。連体形など文中で使われる場合は仮定・婉曲の意味になりやすい。",
    examples: [{ sentence: "われ、行かむ。", note: "私が、行こう。（意志）" }],
  },
  "tari-kanryo": {
    connection: "連用形",
    meanings: ["完了", "存続"],
    notes: "「〜てしまった」なら完了、「〜ている」なら存続。接続は連用形（サ変未然形・四段已然形接続の「り」との違いに注意）。",
    examples: [{ sentence: "花咲きたり。", note: "花が咲いた／咲いている。" }],
  },
  "kaku": {
    connection: "―",
    meanings: ["（動詞の活用の例）"],
    notes: "四段活用動詞の活用パターンを覚える基本例。他の四段活用動詞（読む・行くなど）もこの形に当てはめて考えられる。",
    examples: [{ sentence: "文を書く。", note: "手紙を書く。" }],
  },
  "tsu": {
    connection: "連用形",
    meanings: ["完了", "強意"],
    notes: "「〜てしまう」という完了に加え、意味を強める用法もある。「む」と組み合わさった「〜てむ」は強い推量を表す。",
    examples: [{ sentence: "花散りつ。", note: "花が（すっかり）散ってしまった。" }],
  },
  "nu-kanryo": {
    connection: "連用形",
    meanings: ["完了", "強意"],
    notes: "「つ」と近い意味を持つが、自然にそうなったというニュアンスが強いとされる。打消の「ず」の連体形「ぬ」と形が同じなので接続で見分ける。",
    examples: [{ sentence: "日暮れぬ。", note: "日が暮れてしまった。" }],
  },
  "kemu": {
    connection: "連用形",
    meanings: ["過去推量", "過去原因推量", "伝聞"],
    notes: "過去の出来事について「〜ただろう」と推量する。「なぜ〜たのだろう」という過去の原因の推量になることもある。",
    examples: [{ sentence: "花や散りけむ。", note: "花が散ったのだろうか。" }],
  },
  "ramu": {
    connection: "終止形（ラ変型には連体形）",
    meanings: ["現在推量", "現在の原因推量", "伝聞", "婉曲"],
    notes: "目の前にない出来事について「今ごろ〜だろう」と推量する。原因を推量する用法（なぜ〜のだろう）にも注意。",
    examples: [{ sentence: "今ごろ、花咲くらむ。", note: "今ごろ、花が咲いているだろう。" }],
  },
  "beshi": {
    connection: "終止形（ラ変型には連体形）",
    meanings: ["推量", "意志", "可能", "当然", "命令", "適当"],
    notes: "文脈によって意味が大きく変わる、特に多義的な助動詞。主語や前後の内容から意味を判断する必要がある。",
    examples: [{ sentence: "行くべし。", note: "行くべきだ。（当然）／行くのがよい。（適当）" }],
  },
  "maji": {
    connection: "終止形（ラ変型には連体形）",
    meanings: ["打消推量", "打消意志", "不可能", "禁止", "打消当然"],
    notes: "「べし」の打消にあたる助動詞。「べし」の意味それぞれに対応した打消の意味を持つと考えると覚えやすい。",
    examples: [{ sentence: "行くまじ。", note: "行かないつもりだ。／行くはずがない。" }],
  },
  "mashi": {
    connection: "未然形",
    meanings: ["反実仮想", "ためらいの意志", "実現不可能な希望"],
    notes: "「〜ましかば…まし」の形で「もし〜だったら…だろうに」と、実際には起こらなかったことを仮定する用法が代表的。",
    examples: [{ sentence: "鏡なくば、知らましや。", note: "鏡がなかったら、知っただろうか（いや、知らなかっただろう）。" }],
  },
  "meri": {
    connection: "終止形（ラ変型には連体形）",
    meanings: ["推定", "婉曲"],
    notes: "目に見えるものごとから「〜のようだ」と推定する。断定を避けてやわらかく言う婉曲の用法もある。",
    examples: [{ sentence: "花咲くめり。", note: "花が咲いているようだ。" }],
  },
  "nari-denbun": {
    connection: "終止形（ラ変型には連体形）",
    meanings: ["伝聞", "推定"],
    notes: "音や噂から判断する点が特徴。断定の「なり」（連用形・体言接続）とは接続の違いで見分ける。",
    examples: [{ sentence: "鐘の音すなり。", note: "鐘の音がするようだ（聞こえてくる）。" }],
  },
  "nari-dantei": {
    connection: "体言・連体形",
    meanings: ["断定", "存在"],
    notes: "「〜にあり」が変化した語で「〜だ・〜である」の意味。「〜にて」の形で存在の意味を持つこともある。",
    examples: [{ sentence: "これは花なり。", note: "これは花である。" }],
  },
  "gotoshi": {
    connection: "体言＋の／連体形",
    meanings: ["比況"],
    notes: "「〜のようだ」とたとえる際に使う。「〜が如し」の形で体言や連体形に接続する。",
    examples: [{ sentence: "雪の如し。", note: "雪のようだ。" }],
  },
  "tashi": {
    connection: "連用形",
    meanings: ["希望"],
    notes: "「〜たい」という願望を表す。現代語の「〜たい」の元になった語。",
    examples: [{ sentence: "花を見たし。", note: "花を見たい。" }],
  },
  "ru-jido": {
    connection: "四段・ナ変・ラ変の未然形",
    meanings: ["受身", "自発", "可能", "尊敬"],
    notes: "四段・ナ変・ラ変動詞の未然形に接続する（それ以外の動詞には「らる」を使う）。文脈判断が必須の多義語。",
    examples: [{ sentence: "人に笑はる。", note: "人に笑われる。（受身）" }],
  },
  "sasu-shieki": {
    connection: "未然形（下二段型以外の動詞）",
    meanings: ["使役", "尊敬"],
    notes: "下二段型以外の動詞の未然形に接続する（下二段型などには「しむ」を使う）。「せ給ふ」のように尊敬語と結びつくことが多い。",
    examples: [{ sentence: "子に文を書かす。", note: "子に手紙を書かせる。（使役）" }],
  },
};

// 問題データ(pattern)から解説データを引くヘルパー。
// 将来モジュールが増えた場合は、ここで対象レジストリを切り替える形で拡張する想定。
function getExplanation(pattern) {
  return (
    JODOUSHI_EXPLANATIONS[pattern.id] || {
      connection: "―",
      meanings: [],
      notes: "",
      examples: [],
    }
  );
}

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
  isModalOpen: false,     // 学習メモモーダルを表示中はtrue（盤面操作・タイマーを止める）
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
      console.error(`[雅ラン] 画面要素が見つかりません: #${id}`);
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
  const rowColorVars = getRowColorVars(difficulty);

  // 出題対象として選ばれたパターンの分だけ「正解セット」を用意する
  // （選ばれた種類数 × 6マス）
  // 色(colorVar)は助動詞の種類とは無関係に、盤面上の「並び順(rowIndex)」だけで決める。
  // → 1行目は必ず青、2行目は必ず紫…という固定順になり、出題される助動詞が
  //   毎回ランダムでも、色は毎回6色が重複なく揃う（配色自体は難易度により変わる）。
  selectedPatterns.forEach((pattern, rowIndex) => {
    pattern.forms.forEach((value, colIndex) => {
      deck.push({
        value,
        patternId: pattern.id,
        colorVar: rowColorVars[rowIndex % rowColorVars.length],
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
  const selectedPatterns = getRandomPatterns(PATTERNS, PATTERN_SELECT_COUNT);

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
  state.isModalOpen = false;
  learnModalQueue = [];
  document.getElementById("learn-modal").classList.remove("is-active");

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

  // 難易度によってヒントの強さクラスを切り替える。
  // 初級・中級は「青・紫・赤・緑・黄・水色」を同じ強さで表示し(hint-strongで統一)、
  // 上級のみ色ヒントを一切出さない(hint-none)。
  board.classList.remove("hint-strong", "hint-weak", "hint-none");
  if (state.difficulty === "advanced") board.classList.add("hint-none");
  else board.classList.add("hint-strong");

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
      // PC向け：HTML標準のドラッグ＆ドロップ
      el.addEventListener("dragstart", (e) => onDragStart(e, index));
      el.addEventListener("dragover", (e) => onDragOver(e, index));
      el.addEventListener("dragleave", (e) => onDragLeave(e, index));
      el.addEventListener("drop", (e) => onDrop(e, index));
      // スマホ向け：指でのドラッグ（HTML標準D&DはiPhoneで動作しないため独自実装）
      el.addEventListener("touchstart", (e) => onTouchStart(e, index), { passive: true });
      el.addEventListener("touchmove", (e) => onTouchMove(e), { passive: false });
      el.addEventListener("touchend", (e) => onTouchEnd(e), { passive: false });
      el.addEventListener("touchcancel", () => onTouchCancel(), { passive: true });
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

  // 凡例には「今回選ばれた6種類」を、盤面と同じ色の並び順で表示する。
  // 色は助動詞の種類ではなく、ここでも並び順(index)だけで決める（配色は難易度に応じて切替）。
  const rowColorVars = getRowColorVars(state.difficulty);
  state.selectedPatterns.forEach((pattern, index) => {
    const colorVar = rowColorVars[index % rowColorVars.length];

    const item = document.createElement("span");
    item.className = "legend-item";
    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = `var(${colorVar})`;
    dot.style.color = `var(${colorVar})`;
    item.appendChild(dot);
    item.appendChild(document.createTextNode(pattern.name.replace(/^.+「|」$/g, "")));
    legend.appendChild(item);
  });
}

/* ------------------------------------------------------------------------
   6. マスの選択・入れ替え（クリック／タップ）
   ------------------------------------------------------------------------ */

function onCellClick(index) {
  if (state.isCleared || state.isModalOpen) return;

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
   7-b. タッチ（スマホ）でのドラッグ＆ドロップ対応
   HTML標準のドラッグ＆ドロップAPIはiPhone Safariでは機能しないため、
   touchstart / touchmove / touchend を使って独自に実装する。
   指を大きく動かさなかった場合（＝タップ）は何もせず、
   ブラウザ標準の click イベントに処理を任せる
   （＝従来通りの「タップで2マス選択」操作になる）。
   ------------------------------------------------------------------------ */

const TOUCH_DRAG_THRESHOLD = 8; // これ以上指が動いたら「ドラッグ」とみなす（px）
let touchDragState = null;

function onTouchStart(e, index) {
  if (state.isCleared || state.isModalOpen) return;
  const touch = e.touches[0];
  touchDragState = {
    sourceIndex: index,
    startX: touch.clientX,
    startY: touch.clientY,
    moved: false,
    ghostEl: null,
    width: 0,
    height: 0,
  };
}

function onTouchMove(e) {
  if (!touchDragState) return;
  const touch = e.touches[0];
  const dx = touch.clientX - touchDragState.startX;
  const dy = touch.clientY - touchDragState.startY;

  // しきい値を超えて初めて「ドラッグ開始」とみなし、指に追従する複製マス（ゴースト）を作る
  if (!touchDragState.moved && Math.hypot(dx, dy) > TOUCH_DRAG_THRESHOLD) {
    touchDragState.moved = true;
    const sourceEl = document.querySelector(`.cell[data-index="${touchDragState.sourceIndex}"]`);
    if (sourceEl) {
      const rect = sourceEl.getBoundingClientRect();
      const ghost = sourceEl.cloneNode(true);
      ghost.classList.add("is-dragging-ghost");
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.left = `${rect.left}px`;
      ghost.style.top = `${rect.top}px`;
      document.body.appendChild(ghost);
      touchDragState.ghostEl = ghost;
      touchDragState.width = rect.width;
      touchDragState.height = rect.height;
    }
  }

  if (touchDragState.moved) {
    e.preventDefault(); // ドラッグ中はページ全体のスクロールを止める

    if (touchDragState.ghostEl) {
      touchDragState.ghostEl.style.left = `${touch.clientX - touchDragState.width / 2}px`;
      touchDragState.ghostEl.style.top = `${touch.clientY - touchDragState.height / 2}px`;
    }

    // 指の真下にあるマスをハイライトして「ここに入れ替わる」ことを示す
    document.querySelectorAll(".cell.is-dragover").forEach((el) => el.classList.remove("is-dragover"));
    const under = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetCell = under ? under.closest(".cell:not(.is-dragging-ghost)") : null;
    if (
      targetCell &&
      !targetCell.classList.contains("is-locked") &&
      Number(targetCell.dataset.index) !== touchDragState.sourceIndex
    ) {
      targetCell.classList.add("is-dragover");
    }
  }
}

function onTouchEnd(e) {
  if (!touchDragState) return;

  document.querySelectorAll(".cell.is-dragover").forEach((el) => el.classList.remove("is-dragover"));
  if (touchDragState.ghostEl) {
    touchDragState.ghostEl.remove();
  }

  if (touchDragState.moved) {
    e.preventDefault(); // ドラッグとして処理した場合は、続く click イベントを発生させない
    const touch = e.changedTouches[0];
    const under = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetCell = under ? under.closest(".cell") : null;
    if (targetCell) {
      const targetIndex = Number(targetCell.dataset.index);
      if (!Number.isNaN(targetIndex) && targetIndex !== touchDragState.sourceIndex) {
        swapCells(touchDragState.sourceIndex, targetIndex);
      }
    }
    state.selectedIndex = null;
  }
  // moved が false（＝ほぼ動かなかった＝タップ）の場合はここでは何もしない。
  // このあとブラウザ標準の click イベントが発火し、従来通り「タップで2マス選択」になる。

  touchDragState = null;
}

function onTouchCancel() {
  if (touchDragState && touchDragState.ghostEl) {
    touchDragState.ghostEl.remove();
  }
  document.querySelectorAll(".cell.is-dragover").forEach((el) => el.classList.remove("is-dragover"));
  touchDragState = null;
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

  // 初級モードで学習メモが溜まっている場合は、先にそれを読んでもらってから
  // クリア判定を行う（openNextLearnModal の中で最終的にcheckGameClear()を呼ぶ）。
  if (state.difficulty === "beginner" && learnModalQueue.length > 0) {
    openNextLearnModal();
  } else {
    checkGameClear();
  }
}

// クリア条件は「PATTERNS全件」ではなく「今回選ばれたselectedPatterns」を完成させること
function checkGameClear() {
  if (state.lockedPatternIds.size >= state.selectedPatterns.length) {
    finishGame();
  }
}

// 指定した行が、まだロックされていない完成パターンと完全一致するか判定する。
// 判定対象は state.selectedPatterns（今回抽出された6種類）のみに限定する。
// 指定した行が「活用表として完成している」と判定できるかどうかを調べる。
//
// 【判定条件（2つとも満たす必要がある）】
// ① 6マスの文字が、まだロックされていないいずれかのパターンのformsと完全一致する
// ② 6マスすべてが「同じ助動詞由来（＝同じ色）」であること
//
// ②が今回追加した条件。理由：
// 「○」（活用形が存在しないことを表す記号）は複数の助動詞に共通して登場するため、
// 文字だけで判定すると、実際には別の助動詞由来の「○」マスが紛れ込んでいても
// 見た目の文字列が一致してしまい、誤って「完成」と判定されてしまう不具合があった。
// （例：赤の○・青の○・赤の……のように色がバラバラでも成立してしまっていた）
// 色（＝由来パターン）が全マスで揃っていることを必須条件にすることで、
// 「同じ色の活用形が揃った時のみ完成」という本来の仕様に修正する。
function checkRowCompletion(row) {
  const start = row * state.cols;
  const rowCells = state.cells.slice(start, start + state.cols);

  // ① 6マスすべてが同じ助動詞(patternId)由来かどうか（＝同じ色かどうか）
  const firstPatternId = rowCells[0].patternId;
  const sameOrigin = firstPatternId !== null && rowCells.every((c) => c.patternId === firstPatternId);
  if (!sameOrigin) return null;

  // ② その助動詞がまだロックされておらず、文字の並びも完全一致しているか
  const pattern = state.selectedPatterns.find(
    (p) => p.id === firstPatternId && !state.lockedPatternIds.has(p.id)
  );
  if (!pattern) return null;

  const values = rowCells.map((c) => c.value);
  const valuesMatch = pattern.forms.every((v, i) => v === values[i]);
  return valuesMatch ? pattern : null;
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

  if (state.difficulty === "beginner") {
    // 初級モードは学習メモモーダルで知らせる（複数同時完成にも対応できるようキューに積む）
    learnModalQueue.push(pattern);
  } else {
    showToast(`活用表完成！「${pattern.name}」 +${gained}点`);
  }

  // 完成演出：行灯の光がやわらかく灯るように、少し遅らせてクラスを付与する
  requestAnimationFrame(() => {
    const cellsEls = document.querySelectorAll(`.cell[data-group="${pattern.id}"]`);
    cellsEls.forEach((el) => el.classList.add("is-glow"));
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
  // 一時停止（学習メモモーダル表示中など）から再開しても経過時間が飛ばないよう、
  // 既にelapsedSecondsが溜まっている場合はそのぶんstartTimeを過去にずらしておく。
  state.startTime = Date.now() - state.elapsedSeconds * 1000;
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
   9-b. 学習メモモーダル（初級モード限定）
   一列完成するたびにキューへ積み、1つずつ表示する。
   表示中は盤面操作を止め、タイマーも一時停止する。
   ------------------------------------------------------------------------ */

let learnModalQueue = [];

function openNextLearnModal() {
  const pattern = learnModalQueue.shift();
  if (!pattern) {
    // キューが空になったら、ここで初めてクリア判定を行う
    checkGameClear();
    return;
  }
  showLearnModal(pattern);
}

function showLearnModal(pattern) {
  state.isModalOpen = true;
  stopTimer(); // 学習メモを読んでいる間は経過時間を止める

  const explanation = getExplanation(pattern);

  // 表示順：助動詞名 → 接続 → 意味一覧 → 活用 → 識別のポイント → 例文
  document.getElementById("learn-name").textContent = pattern.name;
  document.getElementById("learn-connection").textContent = explanation.connection || "―";
  document.getElementById("learn-forms").textContent = pattern.forms.join(" ／ ");
  document.getElementById("learn-notes").textContent = explanation.notes || "―";

  // 意味は複数ある助動詞が多いため、箇条書きのリストとして表示する
  const meaningsList = document.getElementById("learn-meanings");
  meaningsList.innerHTML = "";
  if (explanation.meanings && explanation.meanings.length > 0) {
    explanation.meanings.forEach((meaning) => {
      const li = document.createElement("li");
      li.textContent = meaning;
      meaningsList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "―";
    meaningsList.appendChild(li);
  }

  // 例文（1つとは限らないため配列で管理し、複数あれば全て表示する）
  const examplesList = document.getElementById("learn-examples");
  examplesList.innerHTML = "";
  if (explanation.examples && explanation.examples.length > 0) {
    explanation.examples.forEach((example) => {
      const li = document.createElement("li");
      const sentence = document.createElement("span");
      sentence.className = "learn-example-sentence";
      sentence.textContent = example.sentence;
      const note = document.createElement("span");
      note.className = "learn-example-note";
      note.textContent = example.note || "";
      li.appendChild(sentence);
      li.appendChild(note);
      examplesList.appendChild(li);
    });
  }

  document.getElementById("learn-modal").classList.add("is-active");
}

function closeLearnModal() {
  document.getElementById("learn-modal").classList.remove("is-active");
  state.isModalOpen = false;

  if (!state.isCleared) {
    startTimer(); // タイマーを再開（経過時間は維持したまま）
  }

  // キューに次の学習メモがあれば続けて表示し、なければクリア判定へ進む
  openNextLearnModal();
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
    console.error("[雅ラン] 難易度ボタン(.diff-btn)が見つかりません。");
  }
  diffButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const difficulty = btn.dataset.difficulty;
      if (!difficulty) {
        console.error("[雅ラン] data-difficulty が設定されていないボタンがあります。", btn);
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
      state.isModalOpen = false;
      learnModalQueue = [];
      document.getElementById("learn-modal").classList.remove("is-active");
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

  // ⑥ 学習メモモーダル：閉じるボタン
  const learnCloseBtn = document.getElementById("learn-close");
  if (learnCloseBtn) {
    learnCloseBtn.addEventListener("click", () => {
      closeLearnModal();
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
