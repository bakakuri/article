/* ══════════════════════════════════════════════════════════════
   LinguaFlow · pages/statistics.js
══════════════════════════════════════════════════════════════ */

function renderStatistics() {
  const p    = S.profile;
  const prog = getProgress();
  const hist = getXpHistory();

  const totalWords  = Object.keys(prog).length;
  const xp          = p?.total_xp || 0;
  const streak      = p?.streak   || 0;
  const langCodes   = Object.keys(LANGS);
  const activeLangs = langCodes.filter(c => Object.keys(prog).some(k => k.startsWith(c + '_'))).length;

  const dayLabels = ['ორ','სამ','ოთხ','ხუთ','პარ','შაბ','კვ'];
  const today     = new Date();
  const weekly    = Array(7).fill(0);
  hist.forEach(h => {
    const diff = Math.floor((today - new Date(h.date)) / 86400000);
    if (diff >= 0 && diff < 7) weekly[6 - diff] += h.xp;
  });
  const maxXp   = Math.max(...weekly, 1);
  const barCols = weekly.map((v, i) => {
    const dayIdx = (today.getDay() + i - 6 + 7) % 7;
    return `
      <div class="bar-col">
        <div class="bar-fill" style="height:${Math.round((v/maxXp)*100)}%"></div>
        <div class="bar-label">${dayLabels[(dayIdx + 1) % 7]}</div>
      </div>`;
  }).join('');

  const langRows = langCodes.map(code => {
    const total   = getVocab(code).length || 1;
    const learned = Object.keys(prog).filter(k => k.startsWith(code + '_')).length;
    const pct     = Math.round((learned / total) * 100);
    return `
      <div class="lang-progress-row">
        <div class="lang-flag">${LANGS[code].flag}</div>
        <div class="lang-progress-info">
          <div class="lang-progress-name">${LANGS[code].name}</div>
          <div class="lang-progress-bar"><span style="width:${pct}%"></span></div>
        </div>
        <div class="lang-progress-pct">${learned}/${total}</div>
      </div>`;
  }).join('');

  document.getElementById('page-statistics').innerHTML = `
    <div class="page-header"><h1>სტატისტიკა</h1><p>შენი პროგრესი</p></div>

    <div class="stats-big">
      <div class="stat-big-card"><div class="stat-big-icon">⭐</div><div class="stat-big-value">${xp}</div><div class="stat-big-label">სულ XP</div></div>
      <div class="stat-big-card"><div class="stat-big-icon">🔥</div><div class="stat-big-value">${streak}</div><div class="stat-big-label">Streak დღე</div></div>
      <div class="stat-big-card"><div class="stat-big-icon">⚡</div><div class="stat-big-value">${totalWords}</div><div class="stat-big-label">ნასწავლი სიტყვა</div></div>
      <div class="stat-big-card"><div class="stat-big-icon">🌍</div><div class="stat-big-value">${activeLangs}</div><div class="stat-big-label">ენა დაწყებული</div></div>
    </div>

    <div class="chart-card">
      <div class="chart-title">📊 კვირის XP</div>
      <div class="bar-chart">${barCols}</div>
    </div>

    <div class="lang-progress-card">
      <div class="chart-title">🌐 ენების პროგრესი</div>
      ${langRows}
    </div>
  `;
}
