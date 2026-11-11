// 指標の割り当てを受け取ってから experiment.js を読み込む。割り当ての仕組みは 割り当て/Code.gs。
// SETTINGS.assign_url が空のときと，URL に ?pipe=off か ?assign=off を付けたときは，サーバーを使わずにランダムに決める (試すとき用)。
// ?dim=agency のように指定すると，その指標にする (試すとき用。サーバーには記録しない)。
// サーバーから10秒以内に返事がなければランダムに決め，dim_source に random_fallback と記録する
const ASSIGN = (() => {
  const q = new URLSearchParams(location.search);
  return {
    pid: Math.random().toString(36).slice(2, 12),
    useServer: Boolean(SETTINGS.assign_url) && q.get('pipe') !== 'off' && q.get('assign') !== 'off' && !q.get('dim'),
    fixed: q.get('dim'),
    crowd_id: q.get('id') || '',
    dim: null, source: null,
  };
})();
(async () => {
  const keys = SETTINGS.dims.map(d => d.key);
  if (keys.includes(ASSIGN.fixed)) {
    ASSIGN.dim = ASSIGN.fixed; ASSIGN.source = 'url';
  } else if (ASSIGN.useServer) {
    const wait = document.createElement('p');
    wait.textContent = '読み込んでいます。しばらくお待ちください。';
    document.body.appendChild(wait);
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 10000);
      const u = `${SETTINGS.assign_url}?action=assign&pid=${ASSIGN.pid}&crowd_id=${encodeURIComponent(ASSIGN.crowd_id)}`;
      const r = await (await fetch(u, { signal: ctl.signal })).json();
      clearTimeout(timer);
      if (r.ok && keys.includes(r.dim)) { ASSIGN.dim = r.dim; ASSIGN.source = 'server'; }
    } catch (e) { /* 下でランダムに決める */ }
    wait.remove();
    if (!ASSIGN.dim) ASSIGN.source = 'random_fallback';
  }
  if (!ASSIGN.dim) {
    ASSIGN.dim = keys[Math.floor(Math.random() * keys.length)];
    ASSIGN.source = ASSIGN.source || 'random';
  }
  const s = document.createElement('script');
  s.src = 'experiment.js';
  document.body.appendChild(s);
})();
// 最後の質問のあとに，有効かどうかをサーバーに送る。結果を待たずに次へ進む
function reportFinish(valid, reason) {
  if (ASSIGN.source !== 'server') return;
  const u = `${SETTINGS.assign_url}?action=finish&pid=${ASSIGN.pid}&valid=${valid ? 1 : 0}&reason=${encodeURIComponent(reason)}`;
  fetch(u, { keepalive: true }).catch(() => {});
}
