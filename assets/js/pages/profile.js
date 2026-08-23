/* ══════════════════════════════════════════════════════════════
   LinguaFlow · pages/profile.js — Profile / More Page
══════════════════════════════════════════════════════════════ */

function renderMore() {
  const p      = S.profile;
  const uname  = p?.username      || '?';
  const email  = S.user?.email    || '';
  const level  = p?.current_level || 'A1';
  const xp     = p?.total_xp      || 0;
  const streak = p?.streak        || 0;
  const avatar = p?.avatar        || '👤';
  const prog   = getProgress();
  const lang   = LANGS[S.lang]    || LANGS.de;
  const wordsLearned = Object.keys(prog).length;
  const lvIdx   = LEVELS.indexOf(level);
  const nextLv  = LEVELS[lvIdx + 1];
  const xpPct   = Math.min(100, Math.round((xp % 500) / 5));
  const xpToNext= 500 - (xp % 500);

  const ACHIEVEMENTS = [
    { icon:'🌱', title:'პირველი სიტყვა',  done: wordsLearned >= 1  },
    { icon:'📚', title:'10 სიტყვა',        done: wordsLearned >= 10 },
    { icon:'⚡', title:'50 სიტყვა',        done: wordsLearned >= 50 },
    { icon:'🔥', title:'3 Streak',         done: streak >= 3         },
    { icon:'💥', title:'7 Streak',         done: streak >= 7         },
    { icon:'⭐', title:'100 XP',           done: xp >= 100           },
    { icon:'💎', title:'500 XP',           done: xp >= 500           },
    { icon:'🌍', title:'Polyglot',         done: Object.keys(LANGS).filter(c => Object.keys(prog).some(k => k.startsWith(c+'_'))).length >= 3 },
  ];

  const achHtml = ACHIEVEMENTS.map(a => `
    <div class="ach-item${a.done?' ach-done':''}">
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-title">${a.title}</div>
    </div>`).join('');

  const langBars = Object.entries(LANGS).map(([code, l]) => {
    const total   = getVocab(code).length || 1;
    const learned = Object.keys(prog).filter(k => k.startsWith(code + '_')).length;
    const pct     = Math.round((learned / total) * 100);
    return `
      <div class="lang-progress-row">
        <div class="lang-flag">${l.flag}</div>
        <div class="lang-progress-info">
          <div class="lang-progress-name">${l.name}</div>
          <div class="lang-progress-bar"><span style="width:${pct}%"></span></div>
        </div>
        <div class="lang-progress-pct">${learned}/${total}</div>
      </div>`;
  }).join('');

  const langOptions = Object.entries(LANGS).map(([code, l]) => `
    <div class="lang-option${S.lang === code ? ' selected' : ''}" data-lang="${code}">
      <div class="lang-flag-big">${l.flag}</div>
      <div><div class="lang-opt-name">${l.name}</div><div class="lang-opt-label">${l.label}</div></div>
    </div>`).join('');

  const AVATARS = ['👤','🦁','🐯','🦊','🐺','🦝','🐻','🐼','🐨','🐸','🦄','🐲','🧠','🤖','👾','🎭','🌟','💎','🚀','🎯'];

  document.getElementById('page-more').innerHTML = `
    <div class="pf-hero">
      <div class="pf-avatar-wrap">
        <div class="pf-avatar" id="pf-avatar">${avatar}</div>
        <button class="pf-avatar-edit" id="pf-avatar-btn">✏️</button>
      </div>
      <div class="pf-avatar-picker" id="pf-avatar-picker" style="display:none">
        ${AVATARS.map(e=>`<button class="pf-emoji-btn" data-emoji="${e}">${e}</button>`).join('')}
      </div>
      <div class="pf-hero-info">
        <div class="pf-name-row">
          <span class="pf-username" id="pf-username-text">${uname}</span>
          <button class="pf-edit-btn" id="pf-edit-name">✏️</button>
        </div>
        <div id="pf-name-edit" style="display:none" class="pf-name-edit-wrap">
          <input class="field-input pf-name-input" id="pf-name-input" value="${uname}" maxlength="30">
          <button class="adm-btn adm-btn-primary" id="pf-name-save">✓</button>
        </div>
        <div class="pf-email">${email}</div>
        <div class="pf-badges">
          <span class="profile-badge badge-level">${level}</span>
          <span class="profile-badge badge-lang">${lang.flag} ${lang.name}</span>
          ${p?.is_admin ? '<span class="profile-badge badge-admin">🛡️ Admin</span>' : ''}
        </div>
      </div>
    </div>

    <div class="section-card" style="margin-bottom:16px">
      <div class="section-card-label">⭐ XP პროგრესი</div>
      <div class="pf-xp-row">
        <span class="pf-level-badge">${level}</span>
        <div class="pf-xp-bar-wrap">
          <div class="progress-track" style="height:14px">
            <div class="progress-fill" style="width:${xpPct}%"></div>
          </div>
          <div class="pf-xp-labels">
            <span>${xp} XP</span>
            ${nextLv ? `<span>${xpToNext} XP → ${nextLv}</span>` : '<span>მაქსიმუმი! 🏆</span>'}
          </div>
        </div>
        <span class="pf-level-badge" style="opacity:${nextLv?.5:1}">${nextLv||'C2'}</span>
      </div>
    </div>

    <div class="pf-stats">
      <div class="pf-stat"><div class="pf-stat-val">${xp}</div><div class="pf-stat-lbl">XP</div></div>
      <div class="pf-stat"><div class="pf-stat-val">${streak}</div><div class="pf-stat-lbl">Streak</div></div>
      <div class="pf-stat"><div class="pf-stat-val">${wordsLearned}</div><div class="pf-stat-lbl">სიტყვა</div></div>
      <div class="pf-stat"><div class="pf-stat-val">${Object.keys(LANGS).filter(c=>Object.keys(prog).some(k=>k.startsWith(c+'_'))).length}</div><div class="pf-stat-lbl">ენა</div></div>
    </div>

    <div class="section-card">
      <div class="section-card-label">🏆 მიღწევები · ${ACHIEVEMENTS.filter(a=>a.done).length}/${ACHIEVEMENTS.length}</div>
      <div class="ach-grid">${achHtml}</div>
    </div>

    <div class="section-card">
      <div class="section-card-label">🌐 ენების პროგრესი</div>${langBars}
    </div>

    <div class="section-card">
      <div class="section-card-label">🌍 მიმდინარე ენა</div>
      <div class="lang-options" id="more-lang-opts">${langOptions}</div>
    </div>

    <div class="section-card">
      <div class="section-card-label">⚙️ პარამეტრები</div>
      <div class="setting-row"><span class="setting-label">ინტერფეისი</span><span class="setting-value">ქართული 🇬🇪</span></div>
      <div class="setting-row"><span class="setting-label">ვერსია</span><span class="setting-value">1.0.0</span></div>
    </div>

    ${p?.is_admin ? `<button class="adm-open-btn" id="btn-open-admin">🛡️ ადმინ პანელი</button>` : ''}
    <button class="logout-btn" id="btn-logout">გასვლა →</button>
    <div style="height:12px"></div>
  `;

  /* events */
  document.getElementById('more-lang-opts').addEventListener('click', e => {
    const opt = e.target.closest('[data-lang]');
    if (!opt) return;
    S.lang = opt.dataset.lang;
    updateHeader();
    if (S.profile) sb.from('profiles').update({ selected_language: S.lang }).eq('id', S.profile.id).then(() => {});
    toast(`${LANGS[S.lang].flag} ${LANGS[S.lang].name} — არჩეულია!`);
    renderMore();
  });
  document.getElementById('btn-logout').addEventListener('click', doLogout);
  if (p?.is_admin) document.getElementById('btn-open-admin')?.addEventListener('click', openAdmin);

  document.getElementById('pf-avatar-btn').addEventListener('click', () => {
    const pk = document.getElementById('pf-avatar-picker');
    pk.style.display = pk.style.display === 'none' ? 'flex' : 'none';
  });
  document.getElementById('pf-avatar-picker').addEventListener('click', async e => {
    const btn = e.target.closest('.pf-emoji-btn');
    if (!btn) return;
    const emoji = btn.dataset.emoji;
    document.getElementById('pf-avatar').textContent = emoji;
    document.getElementById('pf-avatar-picker').style.display = 'none';
    if (S.profile) { S.profile.avatar = emoji; document.getElementById('hdr-avatar').textContent = emoji; await sb.from('profiles').update({ avatar: emoji }).eq('id', S.profile.id); }
    toast('✅ ავატარი შეიცვალა');
  });
  document.getElementById('pf-edit-name').addEventListener('click', () => {
    document.getElementById('pf-name-edit').style.display = 'flex';
    document.getElementById('pf-edit-name').style.display = 'none';
    document.getElementById('pf-username-text').style.display = 'none';
    document.getElementById('pf-name-input').focus();
  });
  document.getElementById('pf-name-save').addEventListener('click', async () => {
    const val = document.getElementById('pf-name-input').value.trim();
    if (!val || val.length < 2) { toast('სახელი ძალიან მოკლეა'); return; }
    if (S.profile) { S.profile.username = val; await sb.from('profiles').update({ username: val }).eq('id', S.profile.id); }
    toast('✅ სახელი შეიცვალა');
    renderMore();
  });
}
