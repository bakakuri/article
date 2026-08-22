/* ══════════════════════════════════════════════════════════════
   LinguaFlow · admin.js
   ადმინ პანელი — Dashboard · სიტყვები · მომხმარებლები
══════════════════════════════════════════════════════════════ */

let _adminTab  = 'dashboard';
let _adminLang = 'de';

/* ── OPEN / CLOSE ────────────────────────────────────────── */
function openAdmin() {
  if (!S.profile?.is_admin) {
    toast('⛔ ადმინის წვდომა შეზღუდულია');
    return;
  }
  document.getElementById('admin-overlay').classList.add('active');
  switchAdminTab('dashboard');
}

function closeAdmin() {
  document.getElementById('admin-overlay').classList.remove('active');
}

function switchAdminTab(tab) {
  _adminTab = tab;
  document.querySelectorAll('.admin-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  const renders = {
    dashboard : renderAdminDashboard,
    words     : renderAdminWords,
    users     : renderAdminUsers,
  };
  if (renders[tab]) renders[tab]();
}


/* ══════════════════════════════════════════════════════════
   ❶  DASHBOARD
══════════════════════════════════════════════════════════ */
async function renderAdminDashboard() {
  const body = document.getElementById('admin-body');
  body.innerHTML = '<div class="admin-loading">⏳ იტვირთება…</div>';

  const [usersRes, wordsRes] = await Promise.all([
    sb.from('profiles').select('id, username, total_xp, streak, current_level, is_admin, created_at'),
    sb.from('words').select('id, language, level'),
  ]);

  const users  = usersRes.data  || [];
  const words  = wordsRes.data  || [];
  const totalXp = users.reduce((s, u) => s + (u.total_xp || 0), 0);

  const wordsByLang = Object.keys(LANGS).map(code => {
    const count = words.filter(w => w.language === code).length;
    return `<div class="adm-stat-row">
      <span>${LANGS[code].flag} ${LANGS[code].name}</span>
      <strong>${count}</strong>
    </div>`;
  }).join('');

  body.innerHTML = `
    <div class="adm-grid4">
      <div class="adm-card">
        <div class="adm-card-icon">👥</div>
        <div class="adm-card-val">${users.length}</div>
        <div class="adm-card-lbl">მომხმარებელი</div>
      </div>
      <div class="adm-card">
        <div class="adm-card-icon">📝</div>
        <div class="adm-card-val">${words.length}</div>
        <div class="adm-card-lbl">სიტყვა</div>
      </div>
      <div class="adm-card">
        <div class="adm-card-icon">⭐</div>
        <div class="adm-card-val">${totalXp}</div>
        <div class="adm-card-lbl">სულ XP</div>
      </div>
      <div class="adm-card">
        <div class="adm-card-icon">🛡️</div>
        <div class="adm-card-val">${users.filter(u => u.is_admin).length}</div>
        <div class="adm-card-lbl">ადმინი</div>
      </div>
    </div>

    <div class="adm-section">
      <div class="adm-section-title">📊 სიტყვები ენის მიხედვით</div>
      <div class="adm-stat-list">${wordsByLang}</div>
    </div>

    <div class="adm-section">
      <div class="adm-section-title">🌱 data.js-ის სიტყვების Supabase-ში ატვირთვა</div>
      <p class="adm-hint">თუ words ცხრილი ცარიელია, დააჭირე ქვემოთ და ყველა სიტყვა ავტომატურად ჩაიწერება:</p>
      <button class="adm-btn adm-btn-primary" id="btn-seed">
        ⬆️ VOCAB → Supabase (${Object.values(VOCAB).flat().length} სიტყვა)
      </button>
      <div id="seed-result" style="margin-top:12px;font-size:14px"></div>
    </div>
  `;

  document.getElementById('btn-seed').addEventListener('click', async () => {
    const btn = document.getElementById('btn-seed');
    btn.disabled = true;
    btn.textContent = '⏳ იტვირთება…';
    const err = await seedWordsToSupabase();
    const res = document.getElementById('seed-result');
    if (err) {
      res.style.color = '#ff5c7d';
      res.textContent = '❌ შეცდომა: ' + err.message;
    } else {
      res.style.color = '#00c896';
      res.textContent = '✅ ყველა სიტყვა წარმატებით ჩაიწერა!';
    }
    btn.disabled = false;
    btn.textContent = '⬆️ VOCAB → Supabase';
  });
}


/* ══════════════════════════════════════════════════════════
   ❷  WORDS MANAGEMENT
══════════════════════════════════════════════════════════ */
async function renderAdminWords() {
  const body = document.getElementById('admin-body');
  body.innerHTML = '<div class="admin-loading">⏳ იტვირთება…</div>';

  const { data: words, error } = await sb
    .from('words')
    .select('*')
    .eq('language', _adminLang)
    .order('level')
    .order('word');

  const langTabs = Object.entries(LANGS).map(([code, l]) => `
    <button class="adm-lang-tab${_adminLang === code ? ' active' : ''}" data-lang="${code}">
      ${l.flag} ${l.name}
    </button>`).join('');

  const rows = (words || []).map(w => `
    <tr data-id="${w.id}">
      <td class="adm-td-word">
        ${w.article ? `<span class="adm-article">${w.article}</span> ` : ''}${w.word}
      </td>
      <td>${w.translation}</td>
      <td><span class="adm-level-badge">${w.level}</span></td>
      <td class="adm-td-actions">
        <button class="adm-btn adm-btn-sm adm-btn-edit" data-id="${w.id}">✏️</button>
        <button class="adm-btn adm-btn-sm adm-btn-danger" data-id="${w.id}">🗑️</button>
      </td>
    </tr>`).join('');

  body.innerHTML = `
    <div class="adm-lang-tabs" id="adm-lang-tabs">${langTabs}</div>

    <div class="adm-toolbar">
      <span class="adm-count">${(words||[]).length} სიტყვა</span>
      <button class="adm-btn adm-btn-primary" id="btn-add-word">+ სიტყვის დამატება</button>
    </div>

    <div id="word-form-wrap"></div>

    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th>სიტყვა</th>
            <th>თარგმანი (ქართული)</th>
            <th>დონე</th>
            <th>მოქმედება</th>
          </tr>
        </thead>
        <tbody id="words-tbody">${rows || '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px">სიტყვები არ არის</td></tr>'}</tbody>
      </table>
    </div>
  `;

  // lang tabs
  document.getElementById('adm-lang-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    _adminLang = btn.dataset.lang;
    renderAdminWords();
  });

  // add word
  document.getElementById('btn-add-word').addEventListener('click', () =>
    showWordForm(null));

  // edit / delete
  document.getElementById('words-tbody').addEventListener('click', async e => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains('adm-btn-edit')) {
      const word = (words || []).find(w => w.id === id);
      if (word) showWordForm(word);
    }

    if (e.target.classList.contains('adm-btn-danger')) {
      if (!confirm('სიტყვის წაშლა?')) return;
      await sb.from('words').delete().eq('id', id);
      lsSet('words_cache', null);
      toast('🗑️ სიტყვა წაიშალა');
      renderAdminWords();
    }
  });
}

function showWordForm(word = null) {
  const isEdit = !!word;
  const wrap   = document.getElementById('word-form-wrap');

  wrap.innerHTML = `
    <div class="adm-form">
      <div class="adm-form-title">${isEdit ? '✏️ სიტყვის რედაქტირება' : '➕ ახალი სიტყვა'}</div>
      <div class="adm-form-grid">
        <div class="adm-field">
          <label>ენა</label>
          <select id="fw-lang">
            ${Object.entries(LANGS).map(([code,l]) =>
              `<option value="${code}" ${(_adminLang===code||word?.language===code)?'selected':''}>${l.flag} ${l.name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="adm-field">
          <label>სიტყვა</label>
          <input id="fw-word" type="text" placeholder="მაგ. Haus" value="${word?.word || ''}">
        </div>
        <div class="adm-field">
          <label>არტიკლი (სურვ.)</label>
          <input id="fw-article" type="text" placeholder="der / die / das" value="${word?.article || ''}">
        </div>
        <div class="adm-field">
          <label>თარგმანი (ქართული)</label>
          <input id="fw-trans" type="text" placeholder="მაგ. სახლი" value="${word?.translation || ''}">
        </div>
        <div class="adm-field">
          <label>დონე</label>
          <select id="fw-level">
            ${LEVELS.map(lv =>
              `<option value="${lv}" ${word?.level===lv?'selected':''}>${lv}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="adm-form-actions">
        <button class="adm-btn adm-btn-ghost" id="fw-cancel">გაუქმება</button>
        <button class="adm-btn adm-btn-primary" id="fw-save">
          ${isEdit ? 'შენახვა' : 'დამატება'}
        </button>
      </div>
      <div id="fw-error" class="adm-error"></div>
    </div>
  `;

  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('fw-cancel').addEventListener('click', () => {
    wrap.innerHTML = '';
  });

  document.getElementById('fw-save').addEventListener('click', async () => {
    const btn  = document.getElementById('fw-save');
    const lang = document.getElementById('fw-lang').value;
    const w    = document.getElementById('fw-word').value.trim();
    const art  = document.getElementById('fw-article').value.trim() || null;
    const tr   = document.getElementById('fw-trans').value.trim();
    const lv   = document.getElementById('fw-level').value;
    const errEl= document.getElementById('fw-error');

    errEl.textContent = '';
    if (!w)  { errEl.textContent = 'შეიყვანე სიტყვა';   return; }
    if (!tr) { errEl.textContent = 'შეიყვანე თარგმანი'; return; }

    btn.disabled    = true;
    btn.textContent = '⏳…';

    let error;
    if (isEdit) {
      ({ error } = await sb.from('words')
        .update({ language: lang, word: w, article: art, translation: tr, level: lv })
        .eq('id', word.id));
    } else {
      ({ error } = await sb.from('words')
        .insert({ language: lang, word: w, article: art, translation: tr, level: lv }));
    }

    btn.disabled    = false;
    btn.textContent = isEdit ? 'შენახვა' : 'დამატება';

    if (error) {
      errEl.textContent = error.code === '23505'
        ? 'ეს სიტყვა უკვე არსებობს'
        : error.message;
      return;
    }

    lsSet('words_cache', null);
    await loadWords();
    toast(isEdit ? '✅ სიტყვა განახლდა' : '✅ სიტყვა დაემატა');
    _adminLang = lang;
    renderAdminWords();
  });
}


/* ══════════════════════════════════════════════════════════
   ❸  USERS MANAGEMENT
══════════════════════════════════════════════════════════ */
async function renderAdminUsers() {
  const body = document.getElementById('admin-body');
  body.innerHTML = '<div class="admin-loading">⏳ იტვირთება…</div>';

  const { data: users } = await sb
    .from('profiles')
    .select('*')
    .order('total_xp', { ascending: false });

  const rows = (users || []).map(u => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:22px">${u.avatar || '👤'}</span>
          <div>
            <div style="font-weight:700">${u.username}</div>
            <div style="font-size:12px;color:var(--muted)">${u.current_level}</div>
          </div>
        </div>
      </td>
      <td>${u.total_xp || 0} XP</td>
      <td>🔥 ${u.streak || 0}</td>
      <td>
        <label class="adm-toggle">
          <input type="checkbox" ${u.is_admin ? 'checked' : ''}
            onchange="toggleAdmin('${u.id}', this.checked)">
          <span class="adm-toggle-slider"></span>
        </label>
      </td>
      <td>
        <select class="adm-select-sm" onchange="setUserLevel('${u.id}', this.value)">
          ${LEVELS.map(lv => `<option ${u.current_level===lv?'selected':''}>${lv}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('');

  body.innerHTML = `
    <div class="adm-toolbar">
      <span class="adm-count">${(users||[]).length} მომხმარებელი</span>
    </div>
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th>მომხმარებელი</th>
            <th>XP</th>
            <th>Streak</th>
            <th>ადმინი</th>
            <th>დონე</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5">მომხმარებლები არ არის</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

window.toggleAdmin = async function(userId, isAdmin) {
  await sb.from('profiles').update({ is_admin: isAdmin }).eq('id', userId);
  toast(isAdmin ? '✅ ადმინი მინიჭებულია' : '✅ ადმინი გაუქმებულია');
};

window.setUserLevel = async function(userId, level) {
  await sb.from('profiles').update({ current_level: level }).eq('id', userId);
  toast('✅ დონე განახლდა');
};


/* ── init admin events (called from main.js) ─────────── */
function initAdmin() {
  document.getElementById('admin-close').addEventListener('click', closeAdmin);
  document.getElementById('admin-nav').addEventListener('click', e => {
    const btn = e.target.closest('[data-tab]');
    if (btn) switchAdminTab(btn.dataset.tab);
  });
}
