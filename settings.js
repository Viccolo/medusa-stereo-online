// 実験の設定。刺激を作り直したり条件を変えたりするときは，ここだけを書き換える。
const SETTINGS = {
  // DataPipe の実験 ID (pipe.jspsych.org の My Experiments で作る。保存先は Google ドライブ)。
  // 空のときと，URL に ?pipe=off を付けたときは，データを送らず最後に CSV を手元に保存する
  datapipe_id: 'fSFA4FBjiYmI',
  // Yahoo!クラウドソーシングに入力してもらう4桁の作業完了コード。募集ごとに変える
  completion_code: '7403',
  // 1人に出すカップルの数。カップル1組から 役の入れ替え2 × 条件3 = 6試行
  n_couples: 4,
  // 刺激のフォルダ。画像は交差法の並べ方で作ってあり，平行法の人には左右の枠を入れ替えて出す
  stim_dir: 'stim/',
  // 2つの黒い点の中心の間隔 (mm)。平行法でも融合できるように 60mm にする
  dot_separation_mm: 60,
  // 刺激画像の中での2つの黒い点の間隔と，片目分の枠の幅 (画素)。横並び_生成.py の PW+GAP と PW
  dot_separation_px: 516, panel_w: 496, gap: 20,
  // 練習で丸の場所を当てた数がこの数に届かなければ，練習をくり返す (最大 practice_max_rounds 回)
  practice_pass: 3, practice_max_rounds: 3,
  // 評定する3指標。文面は Yahoo!クラウドソーシングの過去の実験 (Google フォーム「Study2」，2025) と同じ。
  // check は定義を読んだかを確かめる問題で，正解は「人間」。順番は参加者ごとにランダムにし，その人の中では固定する
  dims: [
    { key: 'realness', name: '現実性', def: '人物が現実世界の一部である程度を示すものです。', check: ['人間', 'ユニコーン', '神様'] },
    { key: 'agency', name: '行為主体性', def: '人物が自制，道徳，記憶，感情，計画，コミュニケーション，思考などを体験する能力です。', check: ['人間', '猫', '蜘蛛'] },
    { key: 'experience', name: '経験性', def: '人物が空腹，恐怖，痛み，楽しみ，怒り，欲求，性格，意識，誇り，恥ずかしさ，喜びなどを感じる能力です。', check: ['人間', '猫', '蜘蛛'] },
  ],
};
