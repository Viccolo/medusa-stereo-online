// 立体視メデューサ実験。流れ：同意 → 年齢・性別 → 全画面 → カードで画面の大きさを測る → 立体視の説明と練習
// (ここで交差法か平行法かを決める) → 評定の説明 → 本試行 → 事後の質問 → データ送信。
// 指標は参加者間 (Han et al., 2024 の RSOS と同じ)。1人に1つの指標を割り当て，額の外の人物 (L1) と額の中の人物 (L2) の両方を評定してもらう。
// 1試行は3画面：覚えることの確認 → 立体視の画像だけ (スペースキーで次へ) → 画像なしで線の場所と2人の評定
// 保存は一過性注意と空間定位/online と同じ形：DataPipe の拡張が試行ごとにデータを送り，最後に CSV 全体を Google ドライブに保存する。
// 途中でやめた人のデータも .partial.json として残る。完了コードは保存が終わってから表示する
const params = new URLSearchParams(location.search);
const pipeId = params.get('pipe') === 'off' ? '' : SETTINGS.datapipe_id;
const pid = Math.random().toString(36).slice(2, 12);
const filename = `medusa_stereo_${pid}.csv`;
let completed = false;     // 最後の質問まで答えたら true。機器の確認で止まった人には完了コードを出さない
const showEnd = failed => {
  const body = completed
    ? `<p>以上で実験は終わりです。ご協力ありがとうございました。</p><p>作業完了コード：<b style="font-size:28px">${SETTINGS.completion_code}</b></p>
       <p>このコードを控えて，Yahoo!クラウドソーシングの画面に戻って入力してください。</p>`
      + (failed ? '<p>データの送信に失敗しました。お手数ですが，このページを閉じずに，Yahoo!クラウドソーシングのメッセージ機能で依頼者にお知らせください。</p>' : '')
    : '<p>申し訳ありません。お使いの環境ではこの実験に参加できません。</p>';
  jsPsych.getDisplayElement().innerHTML = `<div class="jspsych-content-wrapper"><div class="jspsych-content">${body}</div></div>`;
};
const jsPsych = initJsPsych({
  on_finish: () => { if (!pipeId) { jsPsych.data.get().localSave('csv', filename); showEnd(false); } },
  extensions: [{
    type: jsPsychExtensionPipe,
    params: {
      experiment_id: pipeId || 'none', filename, enabled: Boolean(pipeId),
      wait_message: '<p>データを送信しています。このままお待ちください。</p>',
      on_save: result => showEnd(!result.ok),
    },
  }],
});
const R = jsPsych.randomization;
jsPsych.data.addProperties({ pid, crowd_id: params.get('id') || '' });

let pxPerMm = 3.78;        // カードで測るまでの仮の値 (96dpi)
let parallel = false;      // true なら平行法 (画像の左右の枠を入れ替えて出す)
const dim = R.sampleWithoutReplacement(SETTINGS.dims, 1)[0];   // この参加者が評定する指標
jsPsych.data.addProperties({ dim: dim.key });

// ---------- 刺激の割り当て ----------
// 女性と男性をそれぞれ並べ替え，前から順に組にしてカップルを作る。各カップルで 役 (どちらが L1) 2 × 条件3。
// L1 の側 (左右) は条件ごとに半数ずつ，線の場所は上と下が同じ回数になるように割り当てる。
function makeTrials() {
  const w = R.shuffle(STIM.women), m = R.shuffle(STIM.men);
  const n = Math.min(SETTINGS.n_couples, w.length, m.length);
  const list = [];
  for (let i = 0; i < n; i++) {
    for (const [l1, l2] of [[w[i], m[i]], [m[i], w[i]]]) {
      for (const cond of STIM.conds) list.push({ couple: `${w[i]}-${m[i]}`, l1, l2, cond });
    }
  }
  for (const cond of STIM.conds) {
    const t = list.filter(x => x.cond === cond);
    const sides = R.shuffle(t.map((_, k) => (k % 2 ? 'L' : 'R')));
    t.forEach((x, k) => { x.side = sides[k]; });
  }
  const pos = R.shuffle(list.map((_, k) => STIM.positions[k % STIM.positions.length]));
  list.forEach((x, k) => { x.pos = pos[k]; x.file = STIM.file(x); });
  return R.shuffle(list);
}
const trials = makeTrials();

// ---------- 画像を描く ----------
function stimSizeCss() { return SETTINGS.dot_separation_mm * pxPerMm / SETTINGS.dot_separation_px; }
// 画像は黒い点の間隔が dot_separation_mm になる大きさに縮めて描く。縮めるときは画面の実画素の大きさのキャンバスに滑らかに描く
function drawStim(canvas, src) {
  const im = new Image();
  im.onload = () => {
    const s = stimSizeCss(), dpr = window.devicePixelRatio || 1;
    const cw = im.width * s, ch = im.height * s;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.scale(canvas.width / im.width, canvas.height / im.height);
    const P = SETTINGS.panel_w, G = SETTINGS.gap;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, im.width, im.height);
    if (!parallel) ctx.drawImage(im, 0, 0);
    else {       // 左右の枠を入れ替える (上の黒い点は両方の枠で同じ位置)
      ctx.drawImage(im, P + G, 0, P, im.height, 0, 0, P, im.height);
      ctx.drawImage(im, 0, 0, P, im.height, P + G, 0, P, im.height);
    }
  };
  im.src = src;
}

// ---------- 入力の確認 (スライダーを動かしたか，選択肢を選んだか) ----------
function guardForm(check) {
  const h = e => {
    const msg = check();
    if (msg) { e.preventDefault(); e.stopPropagation(); document.querySelector('.err').textContent = msg; }
  };
  document.addEventListener('submit', h, true);
  return () => document.removeEventListener('submit', h, true);
}
let unguard = () => {};
// 0〜10 の11段階。過去の実験 (Google フォーム) と同じく両端に「最も低い」「最も高い」を付ける
function scaleHtml(name) {
  return `<div class="scale"><span class="end">最も低い</span>
    ${[...Array(11).keys()].map(v => `<label><input type="radio" name="${name}" value="${v}"><br>${v}</label>`).join('')}
    <span class="end">最も高い</span></div>`;
}
function unansweredScales() {
  const names = new Set([...document.querySelectorAll('.scale input')].map(x => x.name));
  return [...names].filter(n => !document.querySelector(`.scale input[name="${n}"]:checked`)).length;
}

// スペースキーで次の画面へ進む (ボタンのない画面で使う)。画面を出してから押すまでの時間を rt に残す
let unspace = () => {};
function onSpace() {
  const t0 = performance.now();
  const h = e => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); unspace(); jsPsych.finishTrial({ rt: Math.round(performance.now() - t0) }); } };
  document.addEventListener('keydown', h);
  unspace = () => document.removeEventListener('keydown', h);
}
// 立体視の画像だけを出す画面。見終わったらスペースキー
function viewScreen(src, data) {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="stim-wrap"><canvas class="stim" id="stim"></canvas></div><p class="small">答えを決めて覚えたら，スペースキーを押してください。</p>`,
    choices: [],
    data,
    on_load: () => { drawStim(document.getElementById('stim'), SETTINGS.stim_dir + (typeof src === 'function' ? src() : src)); onSpace(); },
  };
}

// ---------- 画面 ----------
const consent = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `<div class="left">
    <h3>人物の写真の印象に関する実験</h3>
    <p>この度は，実験にご参加いただき，誠にありがとうございます。</p>
    <p>本研究では，人間の認知特性を明らかにすることを目的として，コンピュータを用いた調査を行います。所要時間は，準備や説明を含めて約20分です。</p>
    <p>本研究への参加は，参加者の皆様の自由な意思によるものであり，参加を辞退されても不利益は一切ございません。また，参加に同意された後でも，理由を問わず，途中で同意を撤回できます。その場合も，不利益が生じることはございません。</p>
    <p>なお，本研究を通じて得られた情報は，本研究に直接関わる目的以外には使用されません。研究の成果は学術論文や学会発表などで公表されることがありますが，データは匿名化し，統計処理した結果だけを公表するため，個人が特定されることはございません。匿名化したデータは，ほかの研究者が結果を検証できるよう，学術研究用のデータリポジトリで公開します。公開するデータには，氏名など個人を特定できる情報は含まれません。</p>
    <p>謝礼はYahoo!クラウドソーシングを通して支払われます。実験の最後に作業完了コードが表示されますので，必ず控えて，Yahoo!クラウドソーシングのページに戻って入力してください。</p>
    <p>本研究は，九州大学大学院人間環境学府倫理委員会の承認 (承認番号: 2024-012) を得た上で実施されています。</p>
    <p>本研究に関するお問い合わせは，以下の連絡先にお願いいたします。<br>担当者: 山田祐樹<br>連絡先 (email): yamadayuk@gmail.com</p>
    <p>この実験では，寄り目にするか，遠くを見るように目の力を抜いて，画面に表示される2枚の画像を重ねて立体的に見る課題があります。目の疲れを感じたら休んでください。立体視で気分が悪くなったことがある方は，参加をご遠慮ください。</p>
    <p>パソコンで参加してください。スマートフォンやタブレットでは参加できません。</p></div>`,
  choices: ['同意して参加する'],
};
// パソコン (マウスあり) で，画面が刺激の入る大きさかを確かめる。一過性注意と空間定位/online と同じ条件
const browserCheck = {
  type: jsPsychBrowserCheck,
  features: ['width', 'height', 'browser', 'browser_version', 'mobile', 'os'],
  minimum_width: params.has('debug') ? 0 : 1024, minimum_height: params.has('debug') ? 0 : 700,
  inclusion_function: d => !d.mobile && window.matchMedia('(pointer: fine)').matches && window.matchMedia('(hover: hover)').matches &&
    !(navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform)),
  exclusion_message: () => '<p>申し訳ありません。この実験は，マウスを使えるパソコンで，画面の幅が1024画素以上，高さが700画素以上の環境でのみ参加できます。</p>',
  window_resize_message: '<p>ブラウザの窓を大きくしてください。</p><p>幅：<span id="browser-check-min-width"></span>，高さ：<span id="browser-check-min-height"></span></p><p>いまの幅：<span id="browser-check-actual-width"></span>，高さ：<span id="browser-check-actual-height"></span></p>',
  resize_fail_button_text: '大きくできない',
};
const demographics = {
  type: jsPsychSurveyHtmlForm,
  preamble: '<p>あなたについて教えてください。</p>',
  html: `<p>年齢：<input name="age" type="number" min="18" max="100" required> 歳</p>
    <p>性別：<label><input type="radio" name="gender" value="male" required>男性</label>
    <label><input type="radio" name="gender" value="female">女性</label>
    <label><input type="radio" name="gender" value="none">回答しない</label></p>`,
  button_label: '次へ',
  data: { phase: 'demographics' },
};
const fullscreen = {
  type: jsPsychFullscreen, fullscreen_mode: true,
  message: '<p>ここから画面を全体表示にします。</p>', button_label: '全体表示にする',
};
const card = {
  type: jsPsychVirtualChinrest,
  blindspot_reps: 0, resize_units: 'none',
  adjustment_prompt: `<div class="left"><p>画面に表示する画像の大きさを，お使いの画面に合わせます。</p>
    <p>クレジットカード，キャッシュカード，ポイントカードなど，同じ大きさのカードを画面に当ててください。下の四角の右下の角をドラッグして，四角をカードと同じ大きさにしてください。</p></div>`,
  adjustment_button_prompt: '同じ大きさにしました',
  data: { phase: 'card' },
  on_finish: d => { pxPerMm = d.item_width_px / d.item_width_mm; },
};

const howto = {
  type: jsPsychHtmlButtonResponse,
  stimulus: () => `<div class="left"><h3>立体的に見る方法</h3>
    <p>この実験では，左右に並んだ2枚の画像を1つに重ねて見ます。2枚は少しずつ違っていて，うまく重なると画像の一部が手前に浮いたり奥にへこんだりして見えます。</p>
    <p>画像の上に黒い点が2つあります。目の力を抜いて，あるいは少し寄り目にして，2つの点が3つに見えるようにしてください。その真ん中の点に目を向けたまま，下の画像が1枚に重なるまで待ってください。重なるまで数秒から十数秒かかることがあります。</p>
    <p>画面から50cmくらい離れて座ってください。顔を画面に対してまっすぐ向け，傾けないでください。</p>
    <p>重ねて見ると，壁の細かい点の模様の中に，横に細長い四角が1つ見えます。四角は画像の上の端か下の端にあります。この四角は，重ねずに見ると見えません。次の練習で，四角が見えるか確かめます。</p>
    <p>練習では，画像を見ている間に，四角が上と下のどちらにあったかを決めて覚えてください。覚えたらスペースキーを押すと画像が消え，答える画面になります。答える画面には画像は表示されません。</p></div>`,
  choices: ['練習を始める'],
};

// 練習：壁だけの画像。画像を消してから，四角の場所と，四角が手前に浮いて見えたか奥にへこんで見えたかを答える
let practiceRound = 0, practiceCorrect = 0, practiceDepth = [];
const PRACTICE_HTML = `<div class="circle-q">細長い四角はどこにありましたか：
  ${['上', '下'].map((n, k) => `<label><input type="radio" name="pos" value="${'UD'[k]}">${n}</label>`).join('')}
  <label><input type="radio" name="pos" value="none">見えなかった</label></div>
  <div class="circle-q">四角は：<label><input type="radio" name="depth" value="near">手前に浮いて見えた</label>
  <label><input type="radio" name="depth" value="far">奥にへこんで見えた</label>
  <label><input type="radio" name="depth" value="none">分からない</label></div>
  <div class="err"></div>`;
const calibIntro = {
  type: jsPsychHtmlButtonResponse,
  stimulus: () => practiceRound === 0 ? '<p>練習を4回行います。</p>'
    : '<p>四角の場所をうまく答えられなかったので，もう一度練習します。黒い点が3つに見えるようにしてから，下の画像が重なるまで待ってください。</p>',
  choices: ['始める'], on_finish: () => { practiceCorrect = 0; practiceDepth = []; },
};
const practiceAnswer = {
  type: jsPsychSurveyHtmlForm,
  html: PRACTICE_HTML,
  button_label: '次へ',
  data: { phase: 'practice', stage: 'calib', pos: jsPsych.timelineVariable('pos') },
  on_load: () => {
    unguard = guardForm(() => {
      const f = document.querySelector('#jspsych-survey-html-form');
      if (!f.querySelector('input[name=pos]:checked') || !f.querySelector('input[name=depth]:checked')) return '両方の質問に答えてください。';
    });
  },
  on_finish: d => {
    unguard(); d.parallel = parallel; d.round = practiceRound;
    d.correct = d.response.pos === d.pos; d.depth = d.response.depth;
    if (d.correct) practiceCorrect++;
    practiceDepth.push(d.response.depth);
  },
};
const practiceView = viewScreen(() => STIM.practice(jsPsych.evaluateTimelineVariable('pos')), { phase: 'practice_view' });
// 上と下を2回ずつ，ランダムな順に出す
const calibTrials = {
  timeline: [practiceView, practiceAnswer],
  timeline_variables: [...STIM.positions, ...STIM.positions].map(pos => ({ pos })),
  randomize_order: true,
};
// 画像は交差法の並べ方なので，交差法で見た人には四角が手前に，平行法で見た人には奥に見える。
// 「奥にへこんで見えた」が「手前に浮いて見えた」より多ければ平行法とみなし，以後は左右の枠を入れ替えて出す
const calib = {
  timeline: [calibIntro, calibTrials],
  loop_function: () => {
    practiceRound++;
    const near = practiceDepth.filter(x => x === 'near').length, far = practiceDepth.filter(x => x === 'far').length;
    if (practiceCorrect >= SETTINGS.practice_pass) {
      parallel = far > near;
      jsPsych.data.addProperties({ parallel, practice_rounds: practiceRound });
      return false;
    }
    if (practiceRound >= SETTINGS.practice_max_rounds) {
      parallel = far > near;
      jsPsych.data.addProperties({ parallel, practice_rounds: practiceRound, practice_failed: true });
      return false;
    }
    return true;
  },
};
// 並べ方を決めたあとの確認 (上と下を1回ずつ)。どちらの見方でも四角が手前に見えるはず
const confirmTrials = {
  timeline: [practiceView, Object.assign({}, practiceAnswer, {
    data: { phase: 'practice', stage: 'confirm', pos: jsPsych.timelineVariable('pos') },
    on_finish: d => { unguard(); d.parallel = parallel; d.correct = d.response.pos === d.pos; d.depth = d.response.depth; },
  })],
  timeline_variables: R.shuffle(STIM.positions).map(pos => ({ pos })),
};
const confirmIntro = {
  type: jsPsychHtmlButtonResponse,
  stimulus: '<p>画像の表示のしかたを，あなたの見方に合わせました。確認のため，あと2回練習します。</p>',
  choices: ['始める'],
};

const ratingIntro = {
  type: jsPsychHtmlButtonResponse,
  stimulus: () => `<div class="left"><h3>本番の課題</h3>
    <p>これから，壁の前に立っている人物と，壁に掛かった額の中の写真の人物が写った画像を ${trials.length} 枚お見せします。あなたには，2人の人物の「${dim.name}」を評価していただきます。まず「${dim.name}」について説明します。</p></div>`,
  choices: ['次へ'],
};
// 過去の実験と同じく，指標の定義を示し，最も説明に合うものを選んでもらってから正解 (人間) を示す
const dimExplain = [{
  type: jsPsychSurveyHtmlForm,
  preamble: `<div class="left"><p>これからご説明するポイントに沿って，「${dim.name}」について，画像に写っている人物に対して評価を行っていただきます。</p>
    <p>「${dim.name}」とは，${dim.def}</p></div>`,
  html: `<p>以上の説明に従って，最も${dim.name}のある者を選んでください。</p>
    <p>${R.shuffle(dim.check).map(c => `<label style="margin:0 12px"><input type="radio" name="check" value="${c}" required>${c}</label>`).join('')}</p>`,
  button_label: '次へ',
  data: { phase: 'definition', dim: dim.key },
  on_finish: x => { x.check_correct = x.response.check === '人間'; },
}, {
  type: jsPsychHtmlButtonResponse,
  stimulus: '<p>最も説明に合うのは「人間」です。</p><p>説明をよく理解した上で，次のページへ進んでください。</p>',
  choices: ['次へ'],
}];
// 見ている間に覚えることを先に伝える
const REMEMBER = `浮いて見える四角は上か下か，額の外の人物の${dim.name}は0から10のどれか，額の中の人物の${dim.name}は0から10のどれか`;
const ratingStart = {
  type: jsPsychHtmlButtonResponse,
  stimulus: () => `<div class="left"><p>それぞれの画像には，額の外に立っている人物と，額の中の写真の人物がいます。「${dim.name}」とは，${dim.def}この定義は評価の画面には表示されません。</p>
    <p>練習と同じように画像を重ねて見てください。画像が1つに重なって見えたら，次の3つを覚えてください。</p>
    <ol><li>写真の上の端か下の端に，手前に浮いて見える細長い四角があります。それが上と下のどちらにあったか。</li>
    <li>額の外にいる人物の${dim.name}が，0 (最も低い) から10 (最も高い) のどの数字か。</li>
    <li>額の中にいる人物の${dim.name}が，0から10のどの数字か。</li></ol>
    <p>3つとも答えを決めて覚えたら，スペースキーを押してください。画像が消えてから，この3つをおたずねします。答えるときには画像は表示されません。</p></div>`,
  choices: ['本番を始める'],
};

// 1試行：覚えることの確認 → 画像だけ → 画像なしで答える。評定は額の外 (L1)，額の中 (L2) の順
function mainTrial(t, k) {
  const item = (role, where) => `<div class="item"><div class="label">額の${where}にいる人物の${dim.name}を評価してください。</div>${scaleHtml(role)}</div>`;
  return { timeline: [{
    type: jsPsychHtmlButtonResponse,
    stimulus: `<p>覚えること：${REMEMBER}。数字は画像を見ている間に決めてください。</p><p>準備ができたらスペースキーを押してください。</p>`,
    choices: [],
    data: { phase: 'cue', trial_no: k + 1 },
    on_load: onSpace,
  }, viewScreen(t.file, { phase: 'view', trial_no: k + 1 }), {
    type: jsPsychSurveyHtmlForm,
    html: `<div class="circle-q">手前に浮いて見えた四角はどこにありましたか：
      ${['上', '下'].map((n, j) => `<label><input type="radio" name="pos" value="${'UD'[j]}">${n}</label>`).join('')}
      <label><input type="radio" name="pos" value="none">見えなかった</label></div>
      <div class="qbox1">${item('L1', '外')}${item('L2', '中')}</div><div class="err"></div>`,
    button_label: '次へ',
    data: { phase: 'main', trial_no: k + 1, ...t },
    on_load: () => {
      unguard = guardForm(() => {
        if (!document.querySelector('input[name=pos]:checked')) return '四角の場所を答えてください。';
        if (unansweredScales()) return 'まだ答えていない質問があります。すべての質問に答えてください。';
      });
    },
    on_finish: d => {
      unguard(); d.parallel = parallel; d.line_resp = d.response.pos; d.line_correct = d.response.pos === t.pos;
      d.L1 = Number(d.response.L1); d.L2 = Number(d.response.L2);
    },
  }] };
}
// 注意の確認 (1回)。本試行の途中に入れる
const attention = {
  type: jsPsychSurveyHtmlForm,
  html: `<div class="left"><p>この画面では画像は表示しません。以下の質問には，説明を読んでいるかを確かめるため，必ず「3」を選んでください。</p>
    <p>今日の天気はどうですか：
    ${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="acq" value="${v}" required>${v}</label>`).join(' ')}</p></div>`,
  button_label: '次へ',
  data: { phase: 'attention' },
  on_finish: d => { d.acq_pass = d.response.acq === '3'; },
};
const mainTimeline = trials.map(mainTrial);
mainTimeline.splice(R.randomInt(8, 16), 0, attention);

const post = {
  type: jsPsychSurveyHtmlForm,
  html: `<div class="left">
    <p>画像を重ねて立体的に見ることは，どのくらいできましたか：<br>
    ${['ほとんどできなかった', 'あまりできなかった', '半分くらいできた', 'だいたいできた', 'ほぼ毎回できた'].map((s, k) => `<label><input type="radio" name="fuse" value="${k + 1}" required>${s}</label>`).join('<br>')}</p>
    <p>どのような見方で重ねましたか：<br>
    <label><input type="radio" name="method" value="cross" required>寄り目にした</label><br>
    <label><input type="radio" name="method" value="parallel">遠くを見るように目の力を抜いた</label><br>
    <label><input type="radio" name="method" value="unknown">分からない</label></p>
    <p>実験について気づいたことや感想があれば書いてください (任意)：<br><textarea name="comment" rows="4" cols="70"></textarea></p></div>`,
  button_label: '送信する',
  data: { phase: 'post' },
  on_finish: () => { completed = true; },
};
const preload = { type: jsPsychPreload, images: [...trials.map(t => SETTINGS.stim_dir + t.file), ...STIM.positions.map(p => SETTINGS.stim_dir + STIM.practice(p))] };
const timeline = [preload, consent, browserCheck, demographics, fullscreen, card, howto, calib, confirmIntro, confirmTrials,
  ratingIntro, ...dimExplain, ratingStart, ...mainTimeline, post];
jsPsych.run(timeline);
