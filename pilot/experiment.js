// 予備調査：立体的に見える画像の見え方。流れ：同意 → 機器の確認 → 年齢・性別 → 全画面 → カードで画面の大きさを測る →
// 立体視の説明 → 見方の判定 (2人のどちらが手前か。ここで交差法か平行法かを決める) → 判定の確認 → 上下のバー (4試行) → 本調査 (20試行) → 事後の質問 → データ送信。
// 本調査の1試行は2画面：立体視の画像だけ (スペースキーで次へ) → 画像なしで，額の中の人物と額の外の人物がそれぞれどう見えたかを -3〜+3 で答える。
// 保存は本番と同じ DataPipe で，ファイル名の先頭を pilot_ にする
const params = new URLSearchParams(location.search);
const pipeId = params.get('pipe') === 'off' ? '' : SETTINGS.datapipe_id;
const pid = Math.random().toString(36).slice(2, 12);
const filename = `pilot_medusa_${pid}.csv`;
let completed = false;
const showEnd = failed => {
  const body = completed
    ? `<p>以上で調査は終わりです。ご協力ありがとうございました。</p><p>作業完了コード：<b style="font-size:28px">${SETTINGS.completion_code}</b></p>
       <p>このコードを控えて，Yahoo!クラウドソーシングの画面に戻って入力してください。</p>`
      + (failed ? '<p>データの送信に失敗しました。お手数ですが，このページを閉じずに，Yahoo!クラウドソーシングのメッセージ機能で依頼者にお知らせください。</p>' : '')
    : '<p>申し訳ありません。お使いの環境ではこの調査に参加できません。</p>';
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
jsPsych.data.addProperties({ pid, crowd_id: params.get('id') || '', study: 'pilot' });

let pxPerMm = 3.78;        // カードで測るまでの仮の値 (96dpi)
let parallel = false;      // true なら平行法 (画像の左右の枠を入れ替えて出す)

// ---------- 画像を描く (本番と同じ) ----------
function stimSizeCss() { return SETTINGS.dot_separation_mm * pxPerMm / SETTINGS.dot_separation_px; }
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
    else {
      ctx.drawImage(im, P + G, 0, P, im.height, 0, 0, P, im.height);
      ctx.drawImage(im, 0, 0, P, im.height, P + G, 0, P, im.height);
    }
  };
  im.src = src;
}
function guardForm(check) {
  const h = e => {
    const msg = check();
    if (msg) { e.preventDefault(); e.stopPropagation(); document.querySelector('.err').textContent = msg; }
  };
  document.addEventListener('submit', h, true);
  return () => document.removeEventListener('submit', h, true);
}
let unguard = () => {};
let unspace = () => {};
function onSpace() {
  const t0 = performance.now();
  const h = e => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); unspace(); jsPsych.finishTrial({ rt: Math.round(performance.now() - t0) }); } };
  document.addEventListener('keydown', h);
  unspace = () => document.removeEventListener('keydown', h);
}
function viewScreen(src, data) {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="stim-wrap"><canvas class="stim" id="stim"></canvas></div><p class="small">見え方を確かめたら，スペースキーを押してください。</p>`,
    choices: [],
    data,
    on_load: () => { drawStim(document.getElementById('stim'), SETTINGS.stim_dir + (typeof src === 'function' ? src() : src)); onSpace(); },
  };
}
// -3 (はっきり引っ込んで見えた) 〜 +3 (はっきり出っ張って見えた) の7段階
function depthScale(name) {
  return `<div class="scale"><span class="end">はっきり<br>引っ込んで見えた</span>
    ${[-3, -2, -1, 0, 1, 2, 3].map(v => `<label><input type="radio" name="${name}" value="${v}"><br>${v > 0 ? '+' + v : v}${v === 0 ? '<br><small style="white-space:nowrap">同じ面</small>' : ''}</label>`).join('')}
    <span class="end">はっきり<br>出っ張って見えた</span></div>`;
}

// ---------- 画面 ----------
const consent = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `<div class="left">
    <h3>立体的に見える画像の見え方に関する調査</h3>
    <p>この度は，調査にご参加いただき，誠にありがとうございます。</p>
    <p>本研究では，人間の認知特性を明らかにすることを目的として，コンピュータを用いた調査を行います。所要時間は，準備や説明を含めて約10分です。</p>
    <p>本研究への参加は，参加者の皆様の自由な意思によるものであり，参加を辞退されても不利益は一切ございません。また，参加に同意された後でも，理由を問わず，途中で同意を撤回できます。その場合も，不利益が生じることはございません。</p>
    <p>なお，本研究を通じて得られた情報は，本研究に直接関わる目的以外には使用されません。研究の成果は学術論文や学会発表などで公表されることがありますが，データは匿名化し，統計処理した結果だけを公表するため，個人が特定されることはございません。匿名化したデータは，ほかの研究者が結果を検証できるよう，学術研究用のデータリポジトリで公開します。公開するデータには，氏名など個人を特定できる情報は含まれません。</p>
    <p>謝礼はYahoo!クラウドソーシングを通して支払われます。調査の最後に作業完了コードが表示されますので，必ず控えて，Yahoo!クラウドソーシングのページに戻って入力してください。</p>
    <p>本研究は，九州大学大学院人間環境学府倫理委員会の承認 (承認番号: 2024-012) を得た上で実施されています。</p>
    <p>本研究に関するお問い合わせは，以下の連絡先にお願いいたします。<br>担当者: 山田祐樹<br>連絡先 (email): yamadayuk@gmail.com</p>
    <p>この調査では，寄り目にするか，遠くを見るように目の力を抜いて，画面に表示される2枚の画像を重ねて立体的に見る課題があります。目の疲れを感じたら休んでください。立体視で気分が悪くなったことがある方は，参加をご遠慮ください。</p>
    <p>パソコンで参加してください。スマートフォンやタブレットでは参加できません。</p></div>`,
  choices: ['同意して参加する'],
};
const browserCheck = {
  type: jsPsychBrowserCheck,
  features: ['width', 'height', 'browser', 'browser_version', 'mobile', 'os'],
  minimum_width: params.has('debug') ? 0 : 1024, minimum_height: params.has('debug') ? 0 : 700,
  inclusion_function: d => !d.mobile && window.matchMedia('(pointer: fine)').matches && window.matchMedia('(hover: hover)').matches &&
    !(navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform)),
  exclusion_message: () => '<p>申し訳ありません。この調査は，マウスを使えるパソコンで，画面の幅が1024画素以上，高さが700画素以上の環境でのみ参加できます。</p>',
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
  stimulus: `<div class="left"><h3>立体的に見る方法</h3>
    <p>この調査では，左右に並んだ2枚の画像を1つに重ねて見ます。2枚は少しずつ違っていて，うまく重なると，画像の中の人物が手前に出っ張ったり，奥に引っ込んだりして見えます。</p>
    <p>画像の上に黒い点が2つあります。目の力を抜いて，あるいは少し寄り目にして，2つの点が3つに見えるようにしてください。その真ん中の点に目を向けたまま，下の画像が1枚に重なるまで待ってください。重なるまで数秒から十数秒かかることがあります。</p>
    <p>画面から50cmくらい離れて座ってください。顔を画面に対してまっすぐ向け，傾けないでください。</p>
    <p>まず，左右に2人が並んだ画像で練習します。2人のうち1人は手前に，もう1人は奥にあります。重ねて見て，どちらの人物が手前に見えるかを確かめてください。確かめたらスペースキーを押すと画像が消え，答える画面になります。</p></div>`,
  choices: ['練習を始める'],
};

// ---------- 見方の判定 ----------
// J_L は左の人物，J_R は右の人物が手前になる交差法の並べ方。交差法で見ると作りどおりの人物が，平行法で見ると反対の人物が手前に見える
let judgeRound = 0, judgeAns = [];
const JUDGE_HTML = `<div class="circle-q">左右どちらの人物が手前に見えましたか：
  <label><input type="radio" name="near" value="L">左の人物</label>
  <label><input type="radio" name="near" value="R">右の人物</label>
  <label><input type="radio" name="near" value="none">分からない</label></div><div class="err"></div>`;
const judgeAnswer = stage => ({
  type: jsPsychSurveyHtmlForm,
  html: JUDGE_HTML,
  button_label: '次へ',
  data: { phase: 'judge', stage, designed: jsPsych.timelineVariable('near') },
  on_load: () => { unguard = guardForm(() => document.querySelector('input[name=near]:checked') ? '' : '答えを選んでください。'); },
  on_finish: d => {
    unguard(); d.parallel = parallel; d.round = judgeRound; d.answer = d.response.near;
    // 今の並べ方で作りどおりに見えたか (交差法の並べ方を平行法で見ると逆になる)
    const shown = parallel ? (d.designed === 'L' ? 'R' : 'L') : d.designed;
    d.correct = d.answer === shown;
    if (stage === 'judge') judgeAns.push(d.answer === 'none' ? 'none' : (d.answer === d.designed ? 'cross' : 'parallel'));
  },
});
const judgeView = viewScreen(() => `J_${jsPsych.evaluateTimelineVariable('near')}.png`, { phase: 'judge_view' });
const judgeIntro = {
  type: jsPsychHtmlButtonResponse,
  stimulus: () => judgeRound === 0 ? `<p>練習を${SETTINGS.judge_n}回行います。</p>`
    : '<p>答えがそろわなかったので，もう一度練習します。黒い点が3つに見えるようにしてから，下の画像が重なるまで待ってください。</p>',
  choices: ['始める'], on_finish: () => { judgeAns = []; },
};
const judge = {
  timeline: [judgeIntro, {
    timeline: [judgeView, judgeAnswer('judge')],
    timeline_variables: Array.from({ length: SETTINGS.judge_n }, (_, k) => ({ near: k % 2 ? 'R' : 'L' })),
    randomize_order: true,
  }],
  loop_function: () => {
    judgeRound++;
    const cross = judgeAns.filter(x => x === 'cross').length, par = judgeAns.filter(x => x === 'parallel').length;
    if (cross >= SETTINGS.judge_pass || par >= SETTINGS.judge_pass) {
      parallel = par > cross;
      jsPsych.data.addProperties({ parallel, judge_rounds: judgeRound, judge_failed: false });
      return false;
    }
    if (judgeRound >= SETTINGS.judge_max_rounds) {
      parallel = par > cross;
      jsPsych.data.addProperties({ parallel, judge_rounds: judgeRound, judge_failed: true });
      return false;
    }
    return true;
  },
};
// 並べ方を決めたあとの確認 (左と右を1回ずつ)。見方に合わせたので，作りどおりの人物が手前に見えるはず
const confirmIntro = {
  type: jsPsychHtmlButtonResponse,
  stimulus: '<p>画像の表示のしかたを，あなたの見方に合わせました。確認のため，あと2回練習します。</p>',
  choices: ['始める'],
};
const confirmTrials = {
  timeline: [judgeView, judgeAnswer('confirm')],
  timeline_variables: R.shuffle([{ near: 'L' }, { near: 'R' }]),
};

// ---------- 上下のバーが見えるか ----------
// 本番と同じ練習用の画像 (壁だけで，上か下の端に細長い四角が浮く。重ねないと見えない)。上下2回ずつ，四角の場所を答える
const barIntro = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `<div class="left"><h3>四角を探す課題</h3>
    <p>次は，細かい点の模様だけの画像をお見せします。重ねて見ると，模様の中に横に細長い四角が1つ見えます。四角は画像の上の端か下の端にあります。この四角は，重ねずに見ると見えません。</p>
    <p>四角が上と下のどちらにあったかを確かめたら，スペースキーを押してください。画像が消えて，答える画面になります。4回行います。</p></div>`,
  choices: ['始める'],
};
const barTrials = {
  timeline: [viewScreen(() => `T_${jsPsych.evaluateTimelineVariable('pos')}.png`, { phase: 'bar_view' }), {
    type: jsPsychSurveyHtmlForm,
    html: `<div class="circle-q">細長い四角はどこにありましたか：
      <label><input type="radio" name="pos" value="U">上</label>
      <label><input type="radio" name="pos" value="D">下</label>
      <label><input type="radio" name="pos" value="none">見えなかった</label></div><div class="err"></div>`,
    button_label: '次へ',
    data: { phase: 'bar', pos: jsPsych.timelineVariable('pos') },
    on_load: () => { unguard = guardForm(() => document.querySelector('input[name=pos]:checked') ? '' : '答えを選んでください。'); },
    on_finish: d => { unguard(); d.parallel = parallel; d.answer = d.response.pos; d.correct = d.answer === d.pos; },
  }],
  timeline_variables: ['U', 'D', 'U', 'D'].map(pos => ({ pos })),
  randomize_order: true,
};

// ---------- 本調査 ----------
const trials = R.shuffle(SETTINGS.conds.flatMap(cond => ['L', 'R'].flatMap(side =>
  Array.from({ length: SETTINGS.reps }, () => ({ cond, side, file: `${cond}_${side}.png` })))));
const mainIntro = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `<div class="left"><h3>本番の課題</h3>
    <p>これから，壁の前に立っている人物と，壁に掛かった額の中の写真が写った画像を ${trials.length} 枚お見せします。額のない画像もあります。</p>
    <p>練習と同じように，2枚の画像を重ねて見てください。重ねて見たときに，次のことを確かめてください。</p>
    <ol><li>額の中の人物が，額の縁に対して，手前に出っ張って見えるか，同じ面に見えるか，奥に引っ込んで見えるか。</li>
    <li>額の外の人物が，壁に対して，手前に出っ張って見えるか，同じ面に見えるか，奥に引っ込んで見えるか。</li></ol>
    <p>確かめたらスペースキーを押してください。画像が消えて，答える画面になります。-3 (はっきり引っ込んで見えた) から +3 (はっきり出っ張って見えた) までで答えてください。0 は同じ面に見えたことを表します。</p></div>`,
  choices: ['始める'],
};
function mainTrial(t, k) {
  const noFrame = t.cond.startsWith('D');
  const q2 = noFrame ? '人物は，壁に対してどう見えましたか' : '額の外の人物は，壁に対してどう見えましたか';
  return { timeline: [viewScreen(t.file, { phase: 'view', trial_no: k + 1 }), {
    type: jsPsychSurveyHtmlForm,
    html: `<div class="qbox1">
      ${noFrame ? '' : `<div class="item"><div class="label">額の中の人物は，額の縁に対してどう見えましたか</div>${depthScale('L2')}</div>`}
      <div class="item"><div class="label">${q2}</div>${depthScale('L1')}</div>
      <p><label><input type="checkbox" name="nofuse" value="1">この画像は重ねて見ることができなかった</label></p></div><div class="err"></div>`,
    button_label: '次へ',
    data: { phase: 'main', trial_no: k + 1, ...t },
    on_load: () => {
      unguard = guardForm(() => {
        const f = document.querySelector('#jspsych-survey-html-form');
        if (f.querySelector('input[name=nofuse]:checked')) return '';
        const names = noFrame ? ['L1'] : ['L2', 'L1'];
        if (names.some(n => !f.querySelector(`input[name=${n}]:checked`))) return 'すべての質問に答えてください。重ねて見られなかった場合は，下の項目に印を付けてください。';
      });
    },
    on_finish: d => {
      unguard(); d.parallel = parallel;
      d.L2 = d.response.L2 === undefined ? null : Number(d.response.L2);
      d.L1 = d.response.L1 === undefined ? null : Number(d.response.L1);
      d.nofuse = Boolean(d.response.nofuse);
    },
  }] };
}
const mainTimeline = trials.map(mainTrial);

const post = {
  type: jsPsychSurveyHtmlForm,
  html: `<div class="left">
    <p>画像を重ねて立体的に見ることは，どのくらいできましたか：<br>
    ${['ほとんどできなかった', 'あまりできなかった', '半分くらいできた', 'だいたいできた', 'ほぼ毎回できた'].map((s, k) => `<label><input type="radio" name="fuse" value="${k + 1}" required>${s}</label>`).join('<br>')}</p>
    <p>どのような見方で重ねましたか：<br>
    <label><input type="radio" name="method" value="cross" required>寄り目にした</label><br>
    <label><input type="radio" name="method" value="parallel">遠くを見るように目の力を抜いた</label><br>
    <label><input type="radio" name="method" value="unknown">分からない</label></p>
    <p>奥に引っ込んで見える画像はありましたか：<br>
    <label><input type="radio" name="recess" value="yes" required>あった</label>
    <label><input type="radio" name="recess" value="no">なかった (どれも出っ張って見えるか，同じ面に見えた)</label>
    <label><input type="radio" name="recess" value="unknown">分からない</label></p>
    <p>調査について気づいたことや感想があれば書いてください (任意)：<br><textarea name="comment" rows="4" cols="70"></textarea></p></div>`,
  button_label: '送信する',
  data: { phase: 'post' },
  on_finish: () => { completed = true; },
};
const preload = { type: jsPsychPreload, images: [...new Set(trials.map(t => SETTINGS.stim_dir + t.file)), SETTINGS.stim_dir + 'J_L.png', SETTINGS.stim_dir + 'J_R.png', SETTINGS.stim_dir + 'T_U.png', SETTINGS.stim_dir + 'T_D.png'] };
const timeline = [preload, consent, browserCheck, demographics, fullscreen, card, howto, judge, confirmIntro, confirmTrials,
  barIntro, barTrials, mainIntro, ...mainTimeline, post];
jsPsych.run(timeline);
