/* ══════════════════════════════════════════════════════════════
   LinguaFlow · pages/challenges.js
══════════════════════════════════════════════════════════════ */

function renderChallenges() {
  const prog    = getProgress();
  const lang    = LANGS[S.lang] || LANGS.de;
  const learned = Object.keys(prog).filter(k => k.startsWith(S.lang + '_')).length;
  const streak  = S.profile?.streak || 0;
  const todayKey= new Date().toDateString();
  const dailyDone = ls('daily_done') === todayKey;

  const activeLangs = Object.keys(LANGS).filter(c =>
    Object.keys(prog).some(k => k.startsWith(c + '_'))).length;

  const challenges = [
    { icon:'⚡', title:'კვირის ჩელენჯი',  sub:`${lang.flag} ისწავლე 30 სიტყვა`,       val:Math.min(learned,30), total:30, pct:Math.min(100,Math.round((learned/30)*100)), xp:300, done:learned>=30 },
    { icon:'🔥', title:'Streak ჩელენჯი',   sub:'შეინარჩუნე 7-დღიანი streak',            val:Math.min(streak,7),   total:7,  pct:Math.min(100,Math.round((streak/7)*100)),   xp:500, done:streak>=7  },
    { icon:'🌍', title:'Polyglot',          sub:'დაიწყე 3 სხვადასხვა ენა',              val:Math.min(activeLangs,3), total:3, pct:Math.min(100,Math.round((activeLangs/3)*100)), xp:200, done:activeLangs>=3 },
  ];

  const challHtml = challenges.map(c => `
    <div class="challenge-item ${c.done ? 'challenge-done' : ''}">
      <div class="challenge-item-icon">${c.icon}</div>
      <div class="challenge-item-content">
        <div class="challenge-item-title">${c.done ? '✓ ' : ''}${c.title}</div>
        <div class="challenge-item-sub">${c.sub} · ${c.val}/${c.total}</div>
        <div class="challenge-item-track"><span style="width:${c.pct}%"></span></div>
      </div>
      <div class="challenge-item-xp">+${c.xp} XP</div>
    </div>`).join('');

  document.getElementById('page-challenges').innerHTML = `
    <div class="page-header"><h1>ჩელენჯები</h1><p>გამოწვევები და ჯილდოები</p></div>
    <div class="challenge-daily">
      <div class="challenge-badge">⚡ დღის ჩელენჯი</div>
      <div class="challenge-xp-badge">+100 XP</div>
      <div class="challenge-daily-title">${lang.flag} 10 ფლეშქარდი</div>
      <div class="challenge-daily-sub">${lang.name} — 10 სიტყვა${dailyDone ? ' · ✓ შესრულებულია' : ''}</div>
      <button class="challenge-daily-btn" id="ch-daily-btn"
        ${dailyDone ? 'style="opacity:.5;cursor:default"' : ''}>
        ${dailyDone ? '✓ შესრულებული' : 'ჩელენჯის დაწყება →'}
      </button>
    </div>
    <div class="challenges-list">${challHtml}</div>
  `;

  if (!dailyDone) {
    document.getElementById('ch-daily-btn').addEventListener('click', () => {
      lsSet('daily_done', new Date().toDateString());
      startFlashcards(10);
    });
  }
}
