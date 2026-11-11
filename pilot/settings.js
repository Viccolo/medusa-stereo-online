// 予備調査 (立体的に見える画像の見え方) の設定。刺激は 横並び/予備調査_生成.py で作る
const SETTINGS = {
  // DataPipe の実験 ID。本番と同じものを使い，ファイル名の先頭を pilot_ にして区別する。
  // URL に ?pipe=off を付けたときは，データを送らず最後に CSV を手元に保存する
  datapipe_id: 'fSFA4FBjiYmI',
  // Yahoo!クラウドソーシングに入力してもらう6桁の作業完了コード (Yahoo!クラウドソーシングのチェック設問に合わせて6桁。本番の 7403 とは別)
  completion_code: '528866',
  stim_dir: 'stim/',
  // 2つの黒い点の中心の間隔 (mm) と，刺激画像の中での間隔，片目分の枠の幅，枠のあいだ (画素)。本番と同じ
  dot_separation_mm: 60, dot_separation_px: 516, panel_w: 496, gap: 20,
  // 見方の判定：2人のどちらが手前かを judge_n 回聞き，同じ見方を示す答えが judge_pass 回以上なら決める。最大 judge_max_rounds 回くり返す
  judge_n: 4, judge_pass: 3, judge_max_rounds: 3,
  // 本調査：条件10 × L1 の側2 × reps 回
  conds: ['A_m40', 'A_m24', 'A_0', 'A_p24', 'A_p40', 'B_m24', 'B_p24', 'C_m24', 'C_p24', 'D_m24'],
  reps: 1,
};
