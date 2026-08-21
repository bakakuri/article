/* ══════════════════════════════════════════════════════════════
   LinguaFlow · app.js
   State · Utility · Navigation · Page renders · Flashcards
   ──────────────────────────────────────────────────────────────
   დამოკიდებულება (load order):
     config.js  → sb
     data.js    → LANGS, LEVELS, LEVEL_NAMES, VOCAB, GRAMMAR
     app.js     → S, ყველა ფუნქცია
     auth.js    → doLogin, doRegister, doLogout, afterAuth…
     main.js    → bindGlobal() + init()
══════════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════════ */
const S = {
  user     : null,
  profile  : null,
  page     : 'home',
  lang     : 'de',
  filter   : 'all',
  search   : '',
  fcQueue  : [],
  fcIndex  : 0,
  fcFlipped: false,
  fcKnew   : 0,
};


/* ══════════════════════════════════════════════════════════════
   LOCAL STORAGE HELPERS
══════════════════════════════════════════════════════════════ */
function ls(key, def = null) {
  try {
    const v = localStorage.getItem('lf_' + key);
    return v !== null ? JSON.parse(v) : def;
  } catch { return def; }
}

function lsSet(key, val) {
  localStorage.setItem('lf_' + key, JSON.stringify(val));
}

function getProgress()  { return ls('progress', {}); }
function getXpHistory() { return ls('xp_history', []); }

function addXp(amount, reason = '') {
  if (!S.profile) return;
  S.profile.total_xp = (S.profile.total_xp || 0) + amount;
  const hist = getXpHistory();
  hist.push({ date: new Date().toISOString(), xp: amount, reason });
  if (hist.length > 90) hist.splice(0, hist.length - 90);
  lsSet('xp_history', hist);
  updateHeader();
  sb.from('profiles')
    .update({ total_xp: S.profile.total_xp })
    .eq('id', S.profile.id)
    .then(() => {});
}


/* ══════════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════════ */
let _toastTimer = null;

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('visible'), 2400);
}


/* ══════════════════════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════════════════════ */
function openModal(title, html) {
  document.getElementById('modal-title').textContent   = title;
  document.getElementById('modal-content').innerHTML   = html;
  document.getElementById('modal').classList.add('active');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

function showGrammar() {
  const items = GRAMMAR[S.lang] || [];
  const lang  = LANGS[S.lang]  || LANGS.de;
  const html  = items.map(g => `
    <div class="grammar-item">
      <div class="grammar-term">${g.term}</div>
      <div class="grammar-rule">${g.rule}</div>
      <div class="grammar-example">${g.ex}</div>
    </div>`).join('');
  openModal(`${lang.flag} გრამატიკა`, html);
}

function showLevelsModal() {
  const html = LEVELS.map(lv => `
    <div class="modal-item">
      <strong>${lv}</strong>
      <span>${LEVEL_NAMES[lv]}</span>
    </div>`).join('');
  openModal('📚 დონეები', html);
}


/* ══════════════════════════════════════════════════════════════
   HEADER
══════════════════════════════════════════════════════════════ */
function updateHeader() {
  const p    = S.profile;
  const lang = LANGS[S.lang] || LANGS.de;
  if (!p) return;
  document.getElementById('hdr-streak').textContent    = `🔥 ${p.streak || 0}`;
  document.getElementById('hdr-xp').textContent        = `⭐ ${p.total_xp || 0} XP`;
  document.getElementById('hdr-avatar').textContent    = (p.username || '?')[0].toUpperCase();
  document.getElementById('app-brand-name').textContent = `${lang.flag} LinguaFlow`;
}


/* ══════════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════════ */
const PAGE_RENDERS = {
  home       : renderHome,
  words      : renderWords,
  statistics : renderStatistics,
  challenges : renderChallenges,
  more       : renderMore,
};

function goTo(page) {
  S.page = page;

  document.querySelectorAll('.app-page').forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.page === page));

  document.querySelector('.app-content').scrollTop = 0;

  if (PAGE_RENDERS[page]) PAGE_RENDERS[page]();
}


/* ══════════════════════════════════════════════════════════════
   ❶  HOME PAGE
══════════════════════════════════════════════════════════════ */
function renderHome() {
  const p     = S.profile;
  const lang  = LANGS[S.lang] || LANGS.de;
  const vocab = VOCAB[S.lang] || [];
  const level = p?.current_level || 'A1';
  const xp    = p?.total_xp     || 0;
  const streak= p?.streak       || 0;
  const uname = p?.username     || 'სტუმარი';
  const prog  = getProgress();

  const wordsLearned = Object.keys(prog).filter(k => k.startsWith(S.lang + '_')).length;
  const lvIdx  = LEVELS.indexOf(level);
  const nextLv = LEVELS[lvIdx + 1] || 'C2';
  const pct    = Math.min(100, Math.round((xp % 500) / 5));

  const levelCards = LEVELS.map(lv => `
      <div class="level-card ${lv.toLowerCase()}">
        <img src="assets/images/${lv}.svg" alt="${lv}">
      </div>`
  ).join('');

  document.getElementById('page-home').innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <h1>გამარჯობა, <span>${uname}</span> 👋</h1>
        <p>${lang.flag} ${lang.name} — ${vocab.length} სიტყვა</p>
      </div>
      <img src="assets/images/hero-book.svg" class="hero-image" alt="">
      <div class="progress-area">
        <div class="level-box">
          <small>დონე</small>
          <strong>${level}</strong>
        </div>
        <div class="progress-info">
          <div class="progress-label">
            <span>შემდეგი: ${nextLv}</span>
            <span>${pct}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
      </div>
    </section>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-icon">🔥</div>
        <div class="stat-text">
          <div class="stat-label">Streak</div>
          <div class="stat-value">${streak}</div>
          <div class="stat-sub">დღე</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-text">
          <div class="stat-label">XP</div>
          <div class="stat-value">${xp}</div>
          <div class="stat-sub">გამოცდილება</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚡</div>
        <div class="stat-text">
          <div class="stat-label">სიტყვები</div>
          <div class="stat-value">${wordsLearned}</div>
          <div class="stat-sub">ისწავლე</div>
        </div>
      </div>
    </div>

    <div class="feature-grid">
      <div class="feature-card flashcards" id="home-btn-fc">
        <h2>ფლეშქარდები</h2>
        <p>ისწავლე ახალი სიტყვები</p>
        <button class="feature-button">→</button>
        <img src="assets/images/flashcards.svg" alt="">
      </div>
      <div class="feature-card grammar" id="home-btn-gr">
        <h2>გრამატიკა</h2>
        <p>ისწავლე ძირითადი წესები</p>
        <button class="feature-button">→</button>
        <img src="assets/images/grammar.svg" alt="">
      </div>
    </div>

    <div class="daily-goal">
      <div class="goal-icon">🎯</div>
      <div class="goal-content">
        <h3>დღის სავარჯიშო</h3>
        <p>${wordsLearned}/${vocab.length} სიტყვა ისწავლე &middot; ${vocab.length - wordsLearned} დარჩა</p>
      </div>
      <button class="goal-button" id="home-btn-review">ვარჯიში →</button>
    </div>

    <div class="section-title">
      <h2>დონეები</h2>
      <button class="view-all" id="home-btn-levels">ყველა ›</button>
    </div>
    <div class="levels">${levelCards}</div>
  `;

  document.getElementById('home-btn-fc').addEventListener('click',     () => startFlashcards(10));
  document.getElementById('home-btn-gr').addEventListener('click',     showGrammar);
  document.getElementById('home-btn-review').addEventListener('click', () => startFlashcards(10));
  document.getElementById('home-btn-levels').addEventListener('click', showLevelsModal);
}


/* ══════════════════════════════════════════════════════════════
   ❷  WORDS PAGE
══════════════════════════════════════════════════════════════ */
function renderWords() {
  const lang = LANGS[S.lang] || LANGS.de;

  const langTabs = Object.entries(LANGS).map(([code, l]) => `
    <button class="level-tab${S.lang === code ? ' active' : ''}" data-lang="${code}">
      ${l.flag} ${l.name}
    </button>`).join('');

  const lvTabs = ['all', ...LEVELS].map(lv => `
    <button class="level-tab${S.filter === lv ? ' active' : ''}" data-lv="${lv}">
      ${lv === 'all' ? 'ყველა' : lv}
    </button>`).join('');

  document.getElementById('page-words').innerHTML = `
    <div class="page-header">
      <h1>სიტყვები</h1>
      <p>${lang.flag} ${lang.name} · ${VOCAB[S.lang]?.length || 0} სიტყვა</p>
    </div>
    <div class="level-tabs" id="words-lang-tabs">${langTabs}</div>
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input class="search-input" id="words-search" placeholder="სიტყვის ძებნა…" value="${S.search}">
    </div>
    <div class="level-tabs" id="words-lv-tabs">${lvTabs}</div>
    <div class="word-grid" id="word-grid"></div>
  `;

  renderWordGrid();

  document.getElementById('words-search').addEventListener('input', e => {
    S.search = e.target.value.toLowerCase();
    renderWordGrid();
  });

  document.getElementById('words-lang-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    S.lang   = btn.dataset.lang;
    S.search = '';
    S.filter = 'all';
    updateHeader();
    if (S.profile) {
      sb.from('profiles').update({ selected_language: S.lang }).eq('id', S.profile.id).then(() => {});
    }
    renderWords();
  });

  document.getElementById('words-lv-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-lv]');
    if (!btn) return;
    S.filter = btn.dataset.lv;
    renderWordGrid();
    document.querySelectorAll('#words-lv-tabs .level-tab')
      .forEach(b => b.classList.toggle('active', b.dataset.lv === S.filter));
  });
}

function renderWordGrid() {
  const vocab    = VOCAB[S.lang] || [];
  const prog     = getProgress();
  const filtered = vocab.filter(v => {
    const matchLv = S.filter === 'all' || v.lv === S.filter;
    const matchSr = !S.search || v.w.toLowerCase().includes(S.search) || v.t.includes(S.search);
    return matchLv && matchSr;
  });

  const html = filtered.length
    ? filtered.map(v => {
        const learned = prog[S.lang + '_' + v.id] ? '✓ ' : '';
        return `
          <div class="word-card" data-id="${v.id}">
            ${v.a ? `<div class="word-card-article">${v.a}</div>` : ''}
            <div class="word-card-word">${learned}${v.w}</div>
            <div class="word-card-translation">${v.t}</div>
            <div class="word-card-level">${v.lv}</div>
          </div>`;
      }).join('')
    : '<p style="color:var(--muted);padding:20px 0">სიტყვა ვერ მოიძებნა</p>';

  const grid = document.getElementById('word-grid');
  if (!grid) return;
  grid.innerHTML = html;
  grid.addEventListener('click', e => {
    const card = e.target.closest('.word-card');
    if (!card) return;
    const word = (VOCAB[S.lang] || []).find(v => v.id === card.dataset.id);
    if (word) openWordModal(word);
  });
}

function openWordModal(word) {
  const prog = getProgress();
  const done = !!prog[S.lang + '_' + word.id];
  openModal(word.w, `
    <div style="text-align:center;padding:20px 0">
      ${word.a ? `<div style="font-size:16px;color:var(--cyan);font-weight:700;margin-bottom:8px">${word.a}</div>` : ''}
      <div style="font-size:54px;font-weight:800;letter-spacing:-2px;margin-bottom:16px">${word.w}</div>
      <div style="font-size:26px;color:var(--muted);margin-bottom:8px">${word.t}</div>
      <div style="font-size:13px;color:rgba(160,170,200,.5);margin-bottom:28px">
        ${LANGS[S.lang]?.name || ''} &middot; ${word.lv}
      </div>
      ${done
        ? `<div style="color:#00c896;font-size:15px;font-weight:700">✓ ისწავლე</div>`
        : `<button onclick="markLearned('${word.id}')"
             style="padding:14px 36px;border:none;border-radius:14px;background:linear-gradient(90deg,#7425ff,#23d0cf);
                    color:#fff;font-size:16px;font-weight:700;font-family:inherit;cursor:pointer">
             ✓ ვისწავლე (+20 XP)
           </button>`
      }
    </div>
  `);
}

/* global — called from inline onclick */
window.markLearned = function(wordId) {
  const prog = getProgress();
  const key  = S.lang + '_' + wordId;
  if (!prog[key]) {
    prog[key] = { date: new Date().toISOString() };
    lsSet('progress', prog);
    addXp(20, 'word_learned');
    toast('✅ +20 XP — სიტყვა ისწავლე!');
  }
  closeModal();
  renderWordGrid();
};


/* ══════════════════════════════════════════════════════════════
   ❸  STATISTICS PAGE
══════════════════════════════════════════════════════════════ */
function renderStatistics() {
  const p    = S.profile;
  const prog = getProgress();
  const hist = getXpHistory();

  const totalWords = Object.keys(prog).length;
  const xp         = p?.total_xp || 0;
  const streak     = p?.streak   || 0;
  const langCodes  = Object.keys(LANGS);

  /* weekly chart */
  const dayLabels = ['ორ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვ'];
  const today     = new Date();
  const weekly    = Array(7).fill(0);
  hist.forEach(h => {
    const diff = Math.floor((today - new Date(h.date)) / 86400000);
    if (diff >= 0 && diff < 7) weekly[6 - diff] += h.xp;
  });
  const maxXp = Math.max(...weekly, 1);
  const barCols = weekly.map((v, i) => {
    const dayIdx = (today.getDay() + i - 6 + 7) % 7;
    return `
      <div class="bar-col">
        <div class="bar-fill" style="height:${Math.round((v / maxXp) * 100)}%"></div>
        <div class="bar-label">${dayLabels[(dayIdx + 1) % 7]}</div>
      </div>`;
  }).join('');

  /* per-language progress */
  const langRows = langCodes.map(code => {
    const total   = VOCAB[code]?.length || 1;
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

  const activeLangs = langCodes.filter(c =>
    Object.keys(prog).some(k => k.startsWith(c + '_'))).length;

  document.getElementById('page-statistics').innerHTML = `
    <div class="page-header">
      <h1>სტატისტიკა</h1>
      <p>შენი პროგრესი</p>
    </div>

    <div class="stats-big">
      <div class="stat-big-card">
        <div class="stat-big-icon">⭐</div>
        <div class="stat-big-value">${xp}</div>
        <div class="stat-big-label">სულ XP</div>
      </div>
      <div class="stat-big-card">
        <div class="stat-big-icon">🔥</div>
        <div class="stat-big-value">${streak}</div>
        <div class="stat-big-label">Streak დღე</div>
      </div>
      <div class="stat-big-card">
        <div class="stat-big-icon">⚡</div>
        <div class="stat-big-value">${totalWords}</div>
        <div class="stat-big-label">ნასწავლი სიტყვა</div>
      </div>
      <div class="stat-big-card">
        <div class="stat-big-icon">🌍</div>
        <div class="stat-big-value">${activeLangs}</div>
        <div class="stat-big-label">ენა დაწყებული</div>
      </div>
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


/* ══════════════════════════════════════════════════════════════
   ❹  CHALLENGES PAGE
══════════════════════════════════════════════════════════════ */
function renderChallenges() {
  const prog     = getProgress();
  const lang     = LANGS[S.lang] || LANGS.de;
  const learned  = Object.keys(prog).filter(k => k.startsWith(S.lang + '_')).length;
  const streak   = S.profile?.streak || 0;
  const todayKey = new Date().toDateString();
  const dailyDone= ls('daily_done') === todayKey;

  const activeLangs = Object.keys(LANGS).filter(c =>
    Object.keys(prog).some(k => k.startsWith(c + '_'))).length;

  const challenges = [
    {
      icon: '⚡', title: 'კვირის ჩელენჯი',
      sub: `${lang.flag} ისწავლე 30 სიტყვა`,
      val: Math.min(learned, 30), total: 30,
      pct: Math.min(100, Math.round((learned / 30) * 100)),
      xp: 300, done: learned >= 30,
    },
    {
      icon: '🔥', title: 'Streak ჩელენჯი',
      sub: 'შეინარჩუნე 7-დღიანი streak',
      val: Math.min(streak, 7), total: 7,
      pct: Math.min(100, Math.round((streak / 7) * 100)),
      xp: 500, done: streak >= 7,
    },
    {
      icon: '🌍', title: 'მულტი-ენა',
      sub: 'დაიწყე 3 სხვადასხვა ენა',
      val: Math.min(activeLangs, 3), total: 3,
      pct: Math.min(100, Math.round((activeLangs / 3) * 100)),
      xp: 200, done: activeLangs >= 3,
    },
  ];

  const challHtml = challenges.map(c => `
    <div class="challenge-item ${c.done ? 'challenge-done' : ''}">
      <div class="challenge-item-icon">${c.icon}</div>
      <div class="challenge-item-content">
        <div class="challenge-item-title">${c.done ? '✓ ' : ''}${c.title}</div>
        <div class="challenge-item-sub">${c.sub} · ${c.val}/${c.total}</div>
        <div class="challenge-item-track">
          <span style="width:${c.pct}%"></span>
        </div>
      </div>
      <div class="challenge-item-xp">+${c.xp} XP</div>
    </div>`).join('');

  document.getElementById('page-challenges').innerHTML = `
    <div class="page-header">
      <h1>ჩელენჯები</h1>
      <p>გამოწვევები და ჯილდოები</p>
    </div>

    <div class="challenge-daily">
      <div class="challenge-badge">⚡ დღის ჩელენჯი</div>
      <div class="challenge-xp-badge">+100 XP</div>
      <div class="challenge-daily-title">${lang.flag} 10 ფლეშქარდი</div>
      <div class="challenge-daily-sub">
        ${lang.name} — 10 სიტყვა 5 წუთში${dailyDone ? ' · ✓ დასრულებული' : ''}
      </div>
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


/* ══════════════════════════════════════════════════════════════
   ❺  MORE / PROFILE PAGE
══════════════════════════════════════════════════════════════ */
function renderMore() {
  const p     = S.profile;
  const uname = p?.username     || '?';
  const email = S.user?.email   || '';
  const level = p?.current_level|| 'A1';
  const lang  = LANGS[S.lang]   || LANGS.de;
  const prog  = getProgress();

  const langOptions = Object.entries(LANGS).map(([code, l]) => `
    <div class="lang-option${S.lang === code ? ' selected' : ''}" data-lang="${code}">
      <div class="lang-flag-big">${l.flag}</div>
      <div>
        <div class="lang-opt-name">${l.name}</div>
        <div class="lang-opt-label">${l.label}</div>
      </div>
    </div>`).join('');

  document.getElementById('page-more').innerHTML = `
    <div class="page-header">
      <h1>მეტი</h1>
      <p>პროფილი და პარამეტრები</p>
    </div>

    <div class="profile-card">
      <div class="profile-avatar-big">${uname[0]?.toUpperCase() || '?'}</div>
      <div class="profile-info">
        <div class="profile-username">${uname}</div>
        <div class="profile-email">${email}</div>
        <div class="profile-badges">
          <span class="profile-badge badge-level">${level}</span>
          <span class="profile-badge badge-lang">${lang.flag} ${lang.name}</span>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-card-label">🌍 ენის არჩევა</div>
      <div class="lang-options" id="more-lang-opts">${langOptions}</div>
    </div>

    <div class="section-card">
      <div class="section-card-label">📊 ანგარიში</div>
      <div class="setting-row">
        <span class="setting-label">სულ XP</span>
        <span class="setting-value">${p?.total_xp || 0}</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">Streak</span>
        <span class="setting-value">${p?.streak || 0} დღე</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">ნასწავლი სიტყვები</span>
        <span class="setting-value">${Object.keys(prog).length}</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">მიმდინარე დონე</span>
        <span class="setting-value">${level}</span>
      </div>
    </div>

    <div class="section-card">
      <div class="section-card-label">⚙️ სხვა</div>
      <div class="setting-row">
        <span class="setting-label">ვერსია</span>
        <span class="setting-value">1.0.0</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">ინტერფეისი</span>
        <span class="setting-value">ქართული</span>
      </div>
      <button class="logout-btn" id="btn-logout" style="margin-top:14px">გასვლა →</button>
    </div>
  `;

  document.getElementById('more-lang-opts').addEventListener('click', e => {
    const opt = e.target.closest('[data-lang]');
    if (!opt) return;
    S.lang = opt.dataset.lang;
    updateHeader();
    if (S.profile) {
      sb.from('profiles').update({ selected_language: S.lang }).eq('id', S.profile.id).then(() => {});
    }
    toast(`${LANGS[S.lang].flag} ${LANGS[S.lang].name} — არჩეულია!`);
    renderMore();
  });

  document.getElementById('btn-logout').addEventListener('click', doLogout);
}


/* ══════════════════════════════════════════════════════════════
   FLASHCARD EXERCISE
══════════════════════════════════════════════════════════════ */
function startFlashcards(count = 10) {
  const vocab     = VOCAB[S.lang] || [];
  const prog      = getProgress();
  const unlearned = vocab.filter(v => !prog[S.lang + '_' + v.id]);
  const learned   = vocab.filter(v =>  prog[S.lang + '_' + v.id]);
  const pool      = [...unlearned, ...learned].slice(0, count);

  if (!pool.length) { toast('სიტყვები ვერ მოიძებნა'); return; }

  S.fcQueue    = pool;
  S.fcIndex    = 0;
  S.fcFlipped  = false;
  S.fcKnew     = 0;

  document.getElementById('fc-overlay').classList.add('active');
  showFCCard();
}

function showFCCard() {
  const total = S.fcQueue.length;
  const idx   = S.fcIndex;

  if (idx >= total) { showFCSummary(); return; }

  const word = S.fcQueue[idx];
  const pct  = Math.round((idx / total) * 100);

  document.getElementById('fc-prog').style.width    = pct + '%';
  document.getElementById('fc-counter').textContent = `${idx + 1} / ${total}`;
  document.getElementById('fc-article').textContent = word.a || '';
  document.getElementById('fc-word').textContent    = word.w;
  document.getElementById('fc-trans').textContent   = word.t;
  document.getElementById('fc-lang').textContent    = LANGS[S.lang]?.name || 'ქართული';

  S.fcFlipped = false;
  const card  = document.getElementById('fc-card');
  if (card) card.classList.remove('flipped');
  document.getElementById('fc-actions').style.display = 'none';
  document.getElementById('fc-hint').style.display    = '';
}

function showFCSummary() {
  const total    = S.fcQueue.length;
  const xpEarned = S.fcKnew * 15 + (total - S.fcKnew) * 3;
  addXp(xpEarned, 'flashcards');

  document.getElementById('fc-card-wrap').innerHTML = `
    <div class="fc-summary">
      <div class="fc-summary-emoji">${S.fcKnew >= total * .7 ? '🏆' : '💪'}</div>
      <div class="fc-summary-title">${S.fcKnew >= total * .7 ? 'შესანიშნავია!' : 'კარგი მცდელობა!'}</div>
      <div class="fc-summary-sub">სწორი: ${S.fcKnew} / ${total}</div>
      <div class="fc-summary-xp">+${xpEarned} XP</div>
      <button class="fc-summary-btn" id="fc-done">დახურვა</button>
    </div>
  `;

  document.getElementById('fc-prog').style.width      = '100%';
  document.getElementById('fc-actions').style.display = 'none';
  document.getElementById('fc-hint').style.display    = 'none';
  document.getElementById('fc-done').addEventListener('click', closeFCOverlay);
}

function closeFCOverlay() {
  document.getElementById('fc-overlay').classList.remove('active');

  /* restore card HTML */
  document.getElementById('fc-card-wrap').innerHTML = `
    <div class="fc-card" id="fc-card">
      <div class="fc-card-inner">
        <div class="fc-face fc-front">
          <div class="fc-article" id="fc-article"></div>
          <div class="fc-word"    id="fc-word">---</div>
          <div class="fc-tap-hint">შეეხე გადასაბრუნებლად</div>
        </div>
        <div class="fc-face fc-back">
          <div class="fc-lang"        id="fc-lang">ქართული</div>
          <div class="fc-translation" id="fc-trans">---</div>
        </div>
      </div>
    </div>`;

  bindFCCard();

  if (S.page === 'home')       renderHome();
  if (S.page === 'statistics') renderStatistics();
  if (S.page === 'challenges') renderChallenges();
}

function bindFCCard() {
  const card = document.getElementById('fc-card');
  if (!card) return;
  card.addEventListener('click', () => {
    if (S.fcFlipped) return;
    S.fcFlipped = true;
    card.classList.add('flipped');
    document.getElementById('fc-actions').style.display = 'flex';
    document.getElementById('fc-hint').style.display    = 'none';
  });
}


/* ══════════════════════════════════════════════════════════════
   GLOBAL EVENT BINDINGS
══════════════════════════════════════════════════════════════ */
function bindGlobal() {
  /* auth toggles */
  document.getElementById('go-register').addEventListener('click', () => showAuthView('register'));
  document.getElementById('go-login').addEventListener('click',    () => showAuthView('login'));
  document.getElementById('btn-login').addEventListener('click',   doLogin);
  document.getElementById('btn-register').addEventListener('click',doRegister);

  /* enter key in auth fields */
  ['login-email', 'login-password'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => e.key === 'Enter' && doLogin()));
  ['reg-username', 'reg-email', 'reg-password'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => e.key === 'Enter' && doRegister()));

  /* bottom nav */
  document.querySelectorAll('.nav-item').forEach(btn =>
    btn.addEventListener('click', () => goTo(btn.dataset.page)));

  /* modal */
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) closeModal();
  });

  /* flashcard overlay */
  document.getElementById('fc-close').addEventListener('click', closeFCOverlay);
  document.getElementById('fc-yes').addEventListener('click', () => {
    S.fcKnew++;
    const word = S.fcQueue[S.fcIndex];
    if (word) {
      const prog = getProgress();
      const key  = S.lang + '_' + word.id;
      if (!prog[key]) { prog[key] = { date: new Date().toISOString() }; lsSet('progress', prog); }
    }
    S.fcIndex++;
    showFCCard();
  });
  document.getElementById('fc-no').addEventListener('click', () => {
    S.fcIndex++;
    showFCCard();
  });

  /* ESC */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeFCOverlay(); }
  });

  bindFCCard();
}


/* ══════════════════════════════════════════════════════════════
   INIT (called by main.js)
══════════════════════════════════════════════════════════════ */
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    await afterAuth(session.user);
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user && !S.user) {
      await afterAuth(session.user);
    }
    if (event === 'SIGNED_OUT') {
      S.user    = null;
      S.profile = null;
    }
  });
}
