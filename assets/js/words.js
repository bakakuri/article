/* ══════════════════════════════════════════════════════════════
   LinguaFlow · words.js v2
   Supabase-დან სიტყვების ჩატვირთვა + ახალი სქემის ნორმალიზაცია
══════════════════════════════════════════════════════════════ */

window.WORDS     = {};   // { de: [...], en: [...], ... }
window.WORDS_MAP = {};   // { wordId: fullRow }

/* ─── Normalize Supabase row → app format ────────────────── */
function _normalize(row) {
  /* parse JSONB if string */
  const exArr = _j(row.examples)    || [];
  const grArr = _j(row.grammar_notes) || [];
  const relArr= _j(row.related_words) || [];
  const vData = _j(row.verb_data)   || null;
  const altArr= row.alternatives    || [];
  const pEx   = exArr.find(e=>e.is_primary) || exArr[0] || null;

  const norm = {
    id:      row.id,
    w:       row.word,
    a:       row.article || null,
    t:       row.translation_primary || row.translation || '',
    alt:     altArr,
    lv:      row.level,
    ph:      row.ipa || row.phonetic || null,
    type:    row.word_type || 'noun',
    cat:     row.word_type || row.category || null,
    gender:  row.gender || null,
    plural:  row.plural || null,
    def:     row.definition || null,
    note:    row.short_explanation || row.note || null,
    /* primary example */
    ef:      pEx?.sentence    || row.example_foreign    || null,
    ep:      pEx?.phonetic    || row.example_phonetic   || null,
    eg:      pEx?.translation || row.example_georgian   || null,
    /* rich data */
    verb:     vData,
    grammar:  grArr,
    examples: exArr,
    related:  relArr,
    topics:   row.topics || [],
    audioUrl: row.word_audio_url || null,
    imageUrl: row.image_url      || null,
  };

  /* store full row for rich display */
  window.WORDS_MAP[row.id] = norm;
  return norm;
}

function _j(v) {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
}

/* ─── Load from Supabase ─────────────────────────────────── */
async function loadWords() {
  /* try cache first (30 min) */
  const cache = ls('words_cache');
  if (cache && Date.now() - cache.ts < 1800000) {
    window.WORDS = cache.data;
    /* rebuild map */
    Object.values(window.WORDS).flat().forEach(w => { window.WORDS_MAP[w.id] = w; });
    return;
  }

  try {
    const { data, error } = await sb
      .from('words')
      .select(`
        id, language, word, word_type, level,
        article, gender, plural,
        ipa, phonetic, syllables, stress_syllable,
        translation, translation_primary, alternatives,
        definition, short_explanation, note,
        category,
        verb_data, adjective_data,
        examples, grammar_notes,
        example_foreign, example_phonetic, example_georgian,
        related_words, topics,
        word_audio_url, sentence_audio_url, image_url
      `)
      .order('level')
      .order('word');

    if (error || !data || !data.length) { _fallback(); return; }

    const grouped = {};
    Object.keys(LANGS).forEach(c => { grouped[c] = []; });
    data.forEach(row => {
      const lang = row.language;
      if (!grouped[lang]) grouped[lang] = [];
      grouped[lang].push(_normalize(row));
    });

    /* fill missing langs from data.js fallback */
    Object.keys(LANGS).forEach(c => {
      if (!grouped[c].length) grouped[c] = (VOCAB[c] || []).map(_normalizeFallback);
    });

    window.WORDS = grouped;
    lsSet('words_cache', { data: grouped, ts: Date.now() });

  } catch { _fallback(); }
}

function _fallback() {
  window.WORDS = {};
  Object.keys(LANGS).forEach(c => {
    window.WORDS[c] = (VOCAB[c] || []).map(_normalizeFallback);
  });
}

/* normalize data.js format → app format */
function _normalizeFallback(w) {
  const norm = {
    id: w.id, w: w.w, a: w.a||null, t: w.t, alt: [],
    lv: w.lv, ph: w.ph||null, type: w.cat||'noun', cat: w.cat||null,
    gender: null, plural: null, def: null, note: null,
    ef: w.ef||null, ep: w.ep||null, eg: w.eg||null,
    verb: null, grammar: [], examples: [], related: [], topics: [], audioUrl: null, imageUrl: null,
  };
  if (w.ef) norm.examples = [{ sentence:w.ef, phonetic:w.ep||'', translation:w.eg||'', is_primary:true }];
  window.WORDS_MAP[w.id] = norm;
  return norm;
}

/* ─── Helpers ────────────────────────────────────────────── */
function getVocab(lang) {
  const w = window.WORDS[lang];
  return (w && w.length) ? w : (VOCAB[lang]||[]).map(_normalizeFallback);
}

function getWordById(wordId) {
  return window.WORDS_MAP[wordId] || null;
}

/* ─── Seed all VOCAB words to Supabase (admin only) ─────── */
async function seedWordsToSupabase() {
  const rows = [];
  Object.entries(VOCAB).forEach(([lang, words]) => {
    words.forEach(w => {
      const ex = w.ef ? [{ sentence:w.ef, phonetic:w.ep||'', translation:w.eg||'', level:w.lv, is_primary:true }] : [];
      rows.push({
        id:                  w.id,
        language:            lang,
        word:                w.w,
        article:             w.a || null,
        word_type:           w.cat || 'noun',
        level:               w.lv,
        phonetic:            w.ph || null,
        ipa:                 w.ph || null,
        translation:         w.t,
        translation_primary: w.t,
        category:            w.cat || null,
        note:                w.note || null,
        short_explanation:   w.note || null,
        example_foreign:     w.ef || null,
        example_phonetic:    w.ep || null,
        example_georgian:    w.eg || null,
        examples:            JSON.stringify(ex),
        grammar_notes:       JSON.stringify([]),
        related_words:       JSON.stringify([]),
        topics:              [],
      });
    });
  });

  const { error } = await sb
    .from('words')
    .upsert(rows, { onConflict: 'language,word' });

  if (!error) { lsSet('words_cache', null); await loadWords(); }
  return error;
}
