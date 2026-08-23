/* ══════════════════════════════════════════════════════════════
   LinguaFlow · pages/words-page.js — Words/Vocabulary Page
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
      <p>${lang.flag} ${lang.name} · ${getVocab(S.lang).length} სიტყვა</p>
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
    S.lang = btn.dataset.lang; S.search = ''; S.filter = 'all';
    updateHeader();
    if (S.profile) sb.from('profiles').update({ selected_language: S.lang }).eq('id', S.profile.id).then(() => {});
    renderWords();
  });
  document.getElementById('words-lv-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-lv]');
    if (!btn) return;
    S.filter = btn.dataset.lv;
    renderWordGrid();
    document.querySelectorAll('#words-lv-tabs .level-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.lv === S.filter));
  });
}

function renderWordGrid() {
  const vocab    = getVocab(S.lang);
  const prog     = getProgress();
  const filtered = vocab.filter(v => {
    const matchLv = S.filter === 'all' || v.lv === S.filter;
    const matchSr = !S.search || v.w.toLowerCase().includes(S.search) || v.t.includes(S.search);
    return matchLv && matchSr;
  });

  const html = filtered.length
    ? filtered.map(v => {
        const status  = typeof getWordStatus === 'function' ? getWordStatus.call({lang:S.lang}, v.id) : null;
        const statusIcon = status === 'easy' ? '✅' : status === 'medium' ? '🔄' : status === 'hard' ? '↩' : '';
        return `
          <div class="word-card" data-id="${v.id}">
            ${v.a ? `<div class="word-card-article">${v.a}</div>` : ''}
            <div class="word-card-word">${statusIcon} ${v.w}</div>
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
    const word = getVocab(S.lang).find(v => v.id === card.dataset.id);
    if (word) openWordModal(word);
  });
}

function openWordModal(word) {
  const prog = getProgress();
  const done = !!prog[S.lang + '_' + word.id];
  openModal(word.w, `
    <div style="text-align:center;padding:16px 0">
      ${word.a ? `<div style="font-size:16px;color:var(--cyan);font-weight:700;margin-bottom:6px">${word.a}</div>` : ''}
      <div style="font-size:52px;font-weight:900;letter-spacing:-2px;margin-bottom:12px">${word.w}</div>
      ${word.ph ? `<div style="font-size:16px;color:#a060ff;font-style:italic;margin-bottom:12px">${word.ph}</div>` : ''}
      <div style="font-size:24px;color:var(--muted);margin-bottom:6px">${word.t}</div>
      <div style="font-size:12px;color:rgba(160,170,200,.5);margin-bottom:24px">
        ${LANGS[S.lang]?.name || ''} &middot; ${word.lv} ${word.cat ? '&middot; ' + word.cat : ''}
      </div>
      ${word.ef ? `
      <div style="background:rgba(0,0,0,.25);border-radius:14px;padding:14px;margin-bottom:16px;text-align:left">
        <div style="font-size:13px;color:rgba(255,255,255,.35);letter-spacing:1.5px;margin-bottom:8px">EXAMPLE</div>
        <div style="color:var(--cyan);font-size:15px;margin-bottom:6px">${word.ef}</div>
        ${word.eg ? `<div style="color:rgba(255,255,255,.6);font-size:13px">${word.eg}</div>` : ''}
      </div>` : ''}
      ${done
        ? `<div style="color:#00c896;font-size:15px;font-weight:700">✅ ნასწავლია</div>`
        : `<button onclick="markLearned('${word.id}')"
             style="padding:14px 36px;border:none;border-radius:14px;background:linear-gradient(90deg,#7425ff,#23d0cf);
                    color:#fff;font-size:16px;font-weight:700;font-family:inherit;cursor:pointer">
             ✓ ვისწავლე (+20 XP)
           </button>`
      }
    </div>
  `);
}

window.markLearned = function(wordId) {
  const prog = getProgress();
  const key  = S.lang + '_' + wordId;
  if (!prog[key]) {
    prog[key] = { date: new Date().toISOString() };
    lsSet('progress', prog);
    if (typeof setWordStatus === 'function') setWordStatus(wordId, 'easy');
    addXp(20, 'word_learned');
    toast('✅ +20 XP — სიტყვა ისწავლე!');
  }
  closeModal();
  renderWordGrid();
};
