// 実験用_生成.py が書いた刺激の一覧。手で書き換えない
const STIM = {
  women: ["W1", "W2", "W3", "W4"],
  men: ["M1", "M2", "M3", "M4"],
  conds: ["ctrl", "L1f", "L2f"],
  positions: ["U", "D", "L", "R"],
  file: t => `${t.l1}_${t.l2}_${t.cond}_${t.side}_${t.pos}.png`,
  practice: p => `practice_${p}.png`,
};
