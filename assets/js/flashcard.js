/* ══════════════════════════════════════════════════════════════
   LinguaFlow · flashcard.js
   პრემიუმ ფლეშქარდ სისტემა — 3 შეფასება · ფონეტიკა · მაგალითი
══════════════════════════════════════════════════════════════ */

const LANG_FLAGS = { de:'🇩🇪', en:'🇬🇧', fr:'🇫🇷', es:'🇪🇸', ru:'🇷🇺' };
const LANG_CODES = { de:'de-DE', en:'en-US', fr:'fr-FR', es:'es-ES', ru:'ru-RU' };

/* ─── Word status (hard / medium / easy) ──────────────────── */
function getWordStatus(wordId) {
  return ls('wst_' + S.lang + '_' + wordId);
}

function setWordStatus(wordId, status) {
  lsSet('wst_' + S.lang + '_' + wordId, status);
  if (S.user && wordId) {
    sb.from('word_progress').upsert({
      user_id: S.user.id,
      word_id: wordId,
      status,
      reviewed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,word_id' }).then(() => {});
  }
}

function getLearnedWords(lang) {
  return getVocab(lang).filter(w => getWordStatusForLang(lang, w.id) === 'easy');
}

function getReviewWords(lang) {
  return getVocab(lang).filter(w => {
    const s = getWordStatusForLang(lang, w.id);
    return s === 'hard' || s === 'medium';
  });
}

function getWordStatusForLang(lang, wordId) {
  try { return JSON.parse(localStorage.getItem('lf_wst_' + lang + '_' + wordId)); }
  catch { return null; }
}


/* ─── Text-to-speech ──────────────────────────────────────── */
function speakWord(text, lang) {
  if (!text || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANG_CODES[lang] || 'de-DE';
  u.rate = 0.85;
  speechSynthesis.speak(u);
}


/* ─── Start flashcards (overrides app.js version) ─────────── */
function startFlashcards(count = 10, pool = null) {
  const vocab     = pool || getVocab(S.lang);
  const unlearned = vocab.filter(w => getWordStatus(w.id) !== 'easy');
  const learned   = vocab.filter(w => getWordStatus(w.id) === 'easy');
  const queue     = pool
    ? vocab
    : [...unlearned, ...learned].slice(0, count);

  if (!queue.length) { toast('სიტყვები ვერ მოიძებნა'); return; }

  S.fcQueue   = queue;
  S.fcIndex   = 0;
  S.fcKnew    = 0;

  document.getElementById('fc-overlay').classList.add('active');
  renderFCFront();
}


/* ══════════════════════════════════════════════════════════
   FRONT SIDE
══════════════════════════════════════════════════════════ */
function renderFCFront() {
  const word  = S.fcQueue[S.fcIndex];
  const idx   = S.fcIndex;
  const total = S.fcQueue.length;
  const lang  = S.lang;
  const pct   = Math.round((idx / total) * 100);
  const stat  = getWordStatus(word.id);

  document.getElementById('fc-prog').style.width    = pct + '%';
  document.getElementById('fc-counter').textContent = `${idx + 1} / ${total}`;

  document.getElementById('fc-card-wrap').innerHTML = `
    <div class="fc2 fc2-front" id="fc2-card">

      <div class="fc2-top">
        <div class="fc2-lv lv-${word.lv.toLowerCase()}">${word.lv}</div>
        <div class="fc2-flag-orb">${LANG_FLAGS[lang] || '🌐'}</div>
        <button class="fc2-icon-btn" id="fc2-sound">🔊</button>
      </div>

      <button class="fc2-arrow fc2-prev" id="fc2-prev" ${idx === 0 ? 'disabled' : ''}>‹</button>
      <button class="fc2-arrow fc2-next" id="fc2-next" ${idx === total - 1 ? 'disabled' : ''}>›</button>

      <div class="fc2-word-block">
        ${word.a ? `<span class="fc2-article">${word.a}</span>` : ''}
        <div class="fc2-word">${word.w}</div>
        ${word.ph ? `<div class="fc2-phonetic">${word.ph}</div>` : ''}
      </div>

      ${word.cat ? `
      <div class="fc2-tag-row">
        <span class="fc2-tag">🏷 ${word.cat}</span>
      </div>` : ''}

      <div class="fc2-divider"></div>

      <div class="fc2-geo-row">
        <span class="fc2-geo-flag">🇬🇪</span>
        <span class="fc2-geo-word">${word.t}</span>
      </div>

      <div class="fc2-bottom">
        <button class="fc2-icon-btn fc2-star ${stat === 'easy' ? 'fc2-starred' : ''}" id="fc2-star">
          ${stat === 'easy' ? '⭐' : '☆'}
        </button>
        <div class="fc2-counter-badge">${idx + 1} / ${total}</div>
        <button class="fc2-flip-btn" id="fc2-flip">↻ გადატრიალება</button>
      </div>
    </div>
  `;

  /* events */
  document.getElementById('fc2-sound').addEventListener('click', e => {
    e.stopPropagation();
    speakWord(word.w, lang);
  });
  document.getElementById('fc2-prev').addEventListener('click', e => {
    e.stopPropagation();
    if (S.fcIndex > 0) { S.fcIndex--; renderFCFront(); }
  });
  document.getElementById('fc2-next').addEventListener('click', e => {
    e.stopPropagation();
    if (S.fcIndex < S.fcQueue.length - 1) { S.fcIndex++; renderFCFront(); }
  });
  document.getElementById('fc2-star').addEventListener('click', e => {
    e.stopPropagation();
    const s = getWordStatus(word.id);
    setWordStatus(word.id, s === 'easy' ? null : 'easy');
    if (s !== 'easy') { addXp(20, 'word_easy'); toast('⭐ ნასწავლ სიტყვებში გადავიდა!'); }
    renderFCFront();
  });
  document.getElementById('fc2-flip').addEventListener('click', e => {
    e.stopPropagation();
    renderFCBack();
  });
  /* tap card body to flip */
  document.getElementById('fc2-card').addEventListener('click', () => renderFCBack());

  document.getElementById('fc-rating').style.display = 'none';
}


/* ══════════════════════════════════════════════════════════
   BACK SIDE
══════════════════════════════════════════════════════════ */
function renderFCBack() {
  const word = S.fcQueue[S.fcIndex];
  const lang = S.lang;

  document.getElementById('fc-card-wrap').innerHTML = `
    <div class="fc2 fc2-back" id="fc2-card-back">

      <div class="fc2-top">
        <div class="fc2-lv lv-${word.lv.toLowerCase()}">${word.lv}</div>
        <div class="fc2-chat-orb">💬</div>
        <button class="fc2-icon-btn" id="fc2-sound-geo">🔊</button>
      </div>

      <div class="fc2-geo-large">${word.t}</div>
      <div class="fc2-word-sub">
        ${LANG_FLAGS[lang]} ${word.a ? word.a + ' ' : ''}${word.w}
      </div>

      ${word.ef ? `
      <div class="fc2-section-label">— EXAMPLE —</div>
      <div class="fc2-example-box">
        <div class="fc2-ef">${word.ef}</div>
        ${word.eg ? `<div class="fc2-eg">${word.eg}</div>` : ''}
        <button class="fc2-ex-sound" id="fc2-sound-ex">🔊</button>
      </div>` : ''}

      ${word.note ? `
      <div class="fc2-section-label">— NOTE —</div>
      <div class="fc2-note-box">💡 ${word.note}</div>` : ''}

    </div>
  `;

  document.getElementById('fc2-sound-geo').addEventListener('click', e => {
    e.stopPropagation();
    speakWord(word.t, 'ka');
  });
  document.getElementById('fc2-sound-ex')?.addEventListener('click', e => {
    e.stopPropagation();
    speakWord(word.ef, lang);
  });

  document.getElementById('fc-rating').style.display = 'flex';
}


/* ══════════════════════════════════════════════════════════
   RATING — 3 buttons
══════════════════════════════════════════════════════════ */
function rateWord(rating) {
  const word = S.fcQueue[S.fcIndex];
  if (!word) return;

  setWordStatus(word.id, rating);

  if (rating === 'easy') {
    const prog = getProgress();
    const key  = S.lang + '_' + word.id;
    if (!prog[key]) { prog[key] = { date: new Date().toISOString() }; lsSet('progress', prog); }
    addXp(20, 'easy');
    toast('✅ ნასწავლ სიტყვებში გადავიდა! +20 XP');
  } else if (rating === 'medium') {
    addXp(5, 'medium');
    toast('🔄 გასამეობელში დაემატა +5 XP');
  } else {
    addXp(2, 'hard');
    toast('↩ გასამეობელში დაემატა +2 XP');
  }

  S.fcIndex++;
  if (S.fcIndex >= S.fcQueue.length) {
    showFCSummary2();
  } else {
    renderFCFront();
  }
}


/* ══════════════════════════════════════════════════════════
   SUMMARY
══════════════════════════════════════════════════════════ */
function showFCSummary2() {
  const total    = S.fcQueue.length;
  const easyCount= S.fcQueue.filter(w => getWordStatus(w.id) === 'easy').length;
  const xp       = easyCount * 20 + (total - easyCount) * 3;

  document.getElementById('fc-rating').style.display = 'none';
  document.getElementById('fc-prog').style.width = '100%';

  document.getElementById('fc-card-wrap').innerHTML = `
    <div class="fc2-summary">
      <div class="fc2-sum-emoji">${easyCount >= total * .7 ? '🏆' : '💪'}</div>
      <div class="fc2-sum-title">${easyCount >= total * .7 ? 'შესანიშნავია!' : 'კარგი სესია!'}</div>
      <div class="fc2-sum-row">
        <div class="fc2-sum-stat"><span>${easyCount}</span><small>ადვილი ✅</small></div>
        <div class="fc2-sum-stat"><span>${S.fcQueue.filter(w=>getWordStatus(w.id)==='medium').length}</span><small>ისე რა 🔄</small></div>
        <div class="fc2-sum-stat"><span>${S.fcQueue.filter(w=>getWordStatus(w.id)==='hard').length}</span><small>რთული ↩</small></div>
      </div>
      <div class="fc2-sum-xp">+${xp} XP</div>
      <button class="fc2-sum-btn" id="fc2-done">დახურვა</button>
    </div>
  `;

  document.getElementById('fc2-done').addEventListener('click', closeFCOverlay2);
}


/* ─── Close overlay ────────────────────────────────────── */
function closeFCOverlay2() {
  document.getElementById('fc-overlay').classList.remove('active');
  document.getElementById('fc-rating').style.display = 'none';
  /* restore blank card */
  document.getElementById('fc-card-wrap').innerHTML = `
    <div class="fc2 fc2-front" id="fc2-card" style="align-items:center;justify-content:center">
      <div style="color:var(--muted);font-size:32px">💎</div>
    </div>`;

  if (S.page === 'home')       renderHome();
  if (S.page === 'learned')    renderLearned();
  if (S.page === 'review')     renderReview();
  if (S.page === 'statistics') renderStatistics();
}


/* ══════════════════════════════════════════════════════════
   ❻  LEARNED WORDS PAGE
══════════════════════════════════════════════════════════ */
function renderLearned() {
  const lang    = LANGS[S.lang] || LANGS.de;
  const learned = getLearnedWords(S.lang);

  const langTabs = Object.entries(LANGS).map(([code, l]) => `
    <button class="level-tab${S.lang === code ? ' active' : ''}" data-lang="${code}">
      ${l.flag} ${l.name}
    </button>`).join('');

  const cards = learned.length
    ? learned.map(w => `
        <div class="word-card lrn-card">
          ${w.a ? `<div class="word-card-article">${w.a}</div>` : ''}
          <div class="word-card-word">✓ ${w.w}</div>
          <div class="word-card-translation">${w.t}</div>
          <div class="word-card-level">${w.lv}</div>
          <button class="lrn-unlearn" data-id="${w.id}">↩ გასამეობელში</button>
        </div>`)
        .join('')
    : `<div class="lrn-empty">
        <div style="font-size:48px;margin-bottom:16px">📚</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">ნასწავლი სიტყვები ჯერ არ არის</div>
        <div style="color:var(--muted);font-size:14px">ფლეშქარდების სესიაში "ადვილი" დააჭირე</div>
      </div>`;

  document.getElementById('page-learned').innerHTML = `
    <div class="page-header">
      <h1>✅ ნასწავლი სიტყვები</h1>
      <p>${lang.flag} ${lang.name} · ${learned.length} სიტყვა</p>
    </div>

    <div class="level-tabs" id="lrn-lang-tabs">${langTabs}</div>

    ${learned.length ? `
    <div class="lrn-actions">
      <button class="adm-btn adm-btn-primary" id="lrn-practice">
        ▶ სესიის დაწყება (${learned.length})
      </button>
    </div>` : ''}

    <div class="word-grid">${cards}</div>
  `;

  document.getElementById('lrn-lang-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    S.lang = btn.dataset.lang;
    updateHeader();
    renderLearned();
  });

  document.getElementById('lrn-practice')?.addEventListener('click', () =>
    startFlashcards(learned.length, learned));

  document.getElementById('page-learned').addEventListener('click', e => {
    const btn = e.target.closest('.lrn-unlearn');
    if (!btn) return;
    setWordStatus(btn.dataset.id, 'medium');
    toast('🔄 გასამეობელში გადავიდა');
    renderLearned();
  });
}


/* ══════════════════════════════════════════════════════════
   ❼  REVIEW PAGE (hard + medium words)
══════════════════════════════════════════════════════════ */
function renderReview() {
  const lang    = LANGS[S.lang] || LANGS.de;
  const review  = getReviewWords(S.lang);
  const hard    = review.filter(w => getWordStatus(w.id) === 'hard');
  const medium  = review.filter(w => getWordStatus(w.id) === 'medium');

  const langTabs = Object.entries(LANGS).map(([code, l]) => `
    <button class="level-tab${S.lang === code ? ' active' : ''}" data-lang="${code}">
      ${l.flag} ${l.name}
    </button>`).join('');

  const makeCards = (words, label, cls) => words.length ? words.map(w => `
    <div class="word-card rev-card ${cls}">
      ${w.a ? `<div class="word-card-article">${w.a}</div>` : ''}
      <div class="word-card-word">${w.w}</div>
      <div class="word-card-translation">${w.t}</div>
      <div class="word-card-level">${w.lv}</div>
    </div>`).join('') : '';

  document.getElementById('page-review').innerHTML = `
    <div class="page-header">
      <h1>🔄 გასამეობელი</h1>
      <p>${lang.flag} ${lang.name} · ${review.length} სიტყვა</p>
    </div>

    <div class="level-tabs" id="rev-lang-tabs">${langTabs}</div>

    ${review.length ? `
    <div class="rev-stats">
      <div class="rev-stat rev-hard">
        <div class="rev-stat-val">${hard.length}</div>
        <div class="rev-stat-lbl">↩ ძალიან რთული</div>
      </div>
      <div class="rev-stat rev-medium">
        <div class="rev-stat-val">${medium.length}</div>
        <div class="rev-stat-lbl">🔄 ისე რა</div>
      </div>
    </div>

    <div class="rev-actions">
      <button class="adm-btn adm-btn-primary rev-btn-all" id="rev-start-all">
        ▶ ყველა გამეორება (${review.length})
      </button>
      ${hard.length ? `<button class="adm-btn rev-btn-hard" id="rev-start-hard">
        ↩ მხოლოდ რთული (${hard.length})
      </button>` : ''}
    </div>

    ${hard.length ? `<div class="rev-group-label">↩ ძალიან რთული</div>
    <div class="word-grid">${makeCards(hard, 'hard', 'card-hard')}</div>` : ''}

    ${medium.length ? `<div class="rev-group-label" style="margin-top:20px">🔄 ისე რა</div>
    <div class="word-grid">${makeCards(medium, 'medium', 'card-medium')}</div>` : ''}
    ` : `
    <div class="lrn-empty">
      <div style="font-size:48px;margin-bottom:16px">🎉</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">გასამეობელი სიტყვა არ არის!</div>
      <div style="color:var(--muted);font-size:14px">ყველა სიტყვა ნასწავლია ან ჯერ არ შეფასებულა</div>
    </div>`}
  `;

  document.getElementById('rev-lang-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    S.lang = btn.dataset.lang;
    updateHeader();
    renderReview();
  });

  document.getElementById('rev-start-all')?.addEventListener('click',  () => startFlashcards(review.length, review));
  document.getElementById('rev-start-hard')?.addEventListener('click', () => startFlashcards(hard.length, hard));
}
