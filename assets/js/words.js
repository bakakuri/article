/* ══════════════════════════════════════════════════════════════
   LinguaFlow · words.js
   სიტყვების ჩატვირთვა Supabase-იდან · data.js-ის fallback
══════════════════════════════════════════════════════════════ */

window.WORDS = {};   // populated by loadWords()

/* ── Load words from Supabase ────────────────────────────── */
async function loadWords() {
  // try cache first (max 30 min old)
  const cache = ls('words_cache');
  if (cache && Date.now() - cache.ts < 1800000) {
    window.WORDS = cache.data;
    return;
  }

  try {
    const { data, error } = await sb
      .from('words')
      .select('id, language, word, article, translation, level')
      .order('level')
      .order('word');

    if (error || !data || !data.length) {
      _fallbackToVocab();
      return;
    }

    // group by language
    const grouped = {};
    Object.keys(LANGS).forEach(c => { grouped[c] = []; });
    data.forEach(r => {
      if (!grouped[r.language]) grouped[r.language] = [];
      grouped[r.language].push({
        id: r.id,
        w:  r.word,
        a:  r.article || null,
        t:  r.translation,
        lv: r.level,
      });
    });

    // fill empty languages from VOCAB fallback
    Object.keys(LANGS).forEach(c => {
      if (!grouped[c].length) grouped[c] = VOCAB[c] || [];
    });

    window.WORDS = grouped;
    lsSet('words_cache', { data: grouped, ts: Date.now() });

  } catch {
    _fallbackToVocab();
  }
}

function _fallbackToVocab() {
  window.WORDS = VOCAB;
}

/* ── Helper used everywhere in app.js ───────────────────── */
function getVocab(lang) {
  const w = window.WORDS[lang];
  return (w && w.length) ? w : (VOCAB[lang] || []);
}

/* ── Seed Supabase with VOCAB data (admin only) ─────────── */
async function seedWordsToSupabase() {
  const rows = [];
  Object.entries(VOCAB).forEach(([lang, words]) => {
    words.forEach(w => {
      rows.push({
        language:    lang,
        word:        w.w,
        article:     w.a || null,
        translation: w.t,
        level:       w.lv,
      });
    });
  });

  const { error } = await sb
    .from('words')
    .upsert(rows, { onConflict: 'language,word' });

  if (!error) {
    lsSet('words_cache', null);   // invalidate cache
    await loadWords();
  }
  return error;
}
