// 実験の設定。刺激を作り直したり条件を変えたりするときは，ここだけを書き換える。
const SETTINGS = {
  // DataPipe の実験 ID (pipe.jspsych.org の My Experiments で作る。保存先は Google ドライブ)。
  // 空のときと，URL に ?pipe=off を付けたときは，データを送らず最後に CSV を手元に保存する
  datapipe_id: 'fSFA4FBjiYmI',
  // Yahoo!クラウドソーシングに入力してもらう作業完了コード (チェック設問に合わせて6桁)。募集ごとに変える
  completion_code: '935304',
  // 指標の割り当てのサーバー。指標を経験性だけにしたので使わない (2026-11-11)。前の URL：
  // https://script.google.com/macros/s/AKfycbzLapKDgmkBHv9CVx7uIQ1NRcRn9mZOJSyK2ROsTLUIGlkmObgJB0CyT2q0OrsnBO9b/exec
  assign_url: '',
  // 1人に出すカップルの数。カップル1組から 役の入れ替え2 × 条件3 = 6試行
  n_couples: 4,
  // 刺激のフォルダ。画像は交差法の並べ方で作ってあり，平行法の人には左右の枠を入れ替えて出す
  stim_dir: 'stim/',
  // 2つの黒い点の中心の間隔 (mm)。平行法でも融合できるように 60mm にする
  dot_separation_mm: 60,
  // 刺激画像の中での2つの黒い点の間隔と，片目分の枠の幅 (画素)。横並び_生成.py の PW+GAP と PW
  dot_separation_px: 516, panel_w: 496, gap: 20,
  // 見方の判定：2人のどちらが手前かを judge_n 回聞き，同じ見方を示す答えが judge_pass 回以上なら決める。最大 judge_max_rounds 回くり返す (予備調査と同じ)
  judge_n: 4, judge_pass: 3, judge_max_rounds: 3,
  // 評定する指標。経験性だけ (2026-11-11 決定。現実性はほかの意味が混ざりやすく，行為主体性は効果が小さい)。
  // 文面は Yahoo!クラウドソーシングの過去の実験 (Google フォーム「Study2」，2025) と同じ。check は定義を読んだかを確かめる問題で，正解は「人間」
  dims: [
    { key: 'experience', name: '経験性', def: '人物が空腹，恐怖，痛み，楽しみ，怒り，欲求，性格，意識，誇り，恥ずかしさ，喜びなどを感じる能力です。', check: ['人間', '猫', '蜘蛛'] },
  ],
};
