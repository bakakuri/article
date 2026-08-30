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
  const isEdit  = !!word;
  const wrap    = document.getElementById('word-form-wrap');
  const wType   = word?.word_type || 'noun';
  const verbD   = _j(word?.verb_data) || {};
  const exArr   = _j(word?.examples)  || [];
  const grArr   = _j(word?.grammar_notes) || [];
  const pEx     = exArr.find(e=>e.is_primary) || exArr[0] || {};
  const ex2     = exArr.find(e=>!e.is_primary) || {};
  const gr1     = grArr[0] || {};
  const alts    = (word?.alternatives || []).join(', ');

  const typeOpts = ['noun','verb','adjective','adverb','phrase','other'].map(t=>
    `<option value="${t}" ${wType===t?'selected':''}>${t}</option>`).join('');

  const levelOpts = LEVELS.map(lv=>
    `<option value="${lv}" ${word?.level===lv?'selected':''}>${lv}</option>`).join('');

  const langOpts = Object.entries(LANGS).map(([code,l])=>
    `<option value="${code}" ${(_adminLang===code||word?.language===code)?'selected':''}>${l.flag} ${l.name}</option>`).join('');

  const conjRow = (label, key, present, preterite) => `
    <div class="adm-conj-row">
      <span class="adm-conj-pro">${label}</span>
      <input class="adm-conj-inp" placeholder="Präsens" id="fw-p-${key}" value="${present?.[key]||''}">
      <input class="adm-conj-inp" placeholder="Präteritum" id="fw-pt-${key}" value="${preterite?.[key]||''}">
    </div>`;

  wrap.innerHTML = `
  <div class="adm-form adm-form-rich">
    <div class="adm-form-title">${isEdit?'✏️ სიტყვის რედაქტირება':'➕ ახალი სიტყვა'}</div>

    <!-- ① BASIC -->
    <div class="adm-section-lbl">① საბაზისო</div>
    <div class="adm-form-grid">
      <div class="adm-field"><label>ენა</label><select id="fw-lang">${langOpts}</select></div>
      <div class="adm-field"><label>სიტყვა</label><input id="fw-word" type="text" placeholder="gehen" value="${word?.word||''}"></div>
      <div class="adm-field"><label>ტიპი</label><select id="fw-type">${typeOpts}</select></div>
      <div class="adm-field"><label>დონე</label><select id="fw-level">${levelOpts}</select></div>
    </div>

    <!-- ② PHONETICS -->
    <div class="adm-section-lbl">② ფონეტიკა</div>
    <div class="adm-form-grid">
      <div class="adm-field"><label>IPA</label><input id="fw-ipa" type="text" placeholder="/ˈɡeːən/" value="${word?.ipa||word?.phonetic||''}"></div>
      <div class="adm-field"><label>შეწყვეტა (syllables)</label><input id="fw-syl" type="text" placeholder="ge, hen" value="${(word?.syllables||[]).join(', ')}"></div>
    </div>

    <!-- ③ TRANSLATION -->
    <div class="adm-section-lbl">③ თარგმანი</div>
    <div class="adm-form-grid">
      <div class="adm-field"><label>მთავარი თარგმანი (ქართ.)</label><input id="fw-trans" type="text" placeholder="წასვლა" value="${word?.translation_primary||word?.translation||''}"></div>
      <div class="adm-field"><label>დამატებითი (მძიმით)</label><input id="fw-alts" type="text" placeholder="სიარული, მიმოსვლა" value="${alts}"></div>
      <div class="adm-field" style="grid-column:1/-1"><label>განმარტება (target language)</label><input id="fw-def" type="text" placeholder="Sich zu Fuß fortbewegen." value="${word?.definition||''}"></div>
      <div class="adm-field" style="grid-column:1/-1"><label>მოკლე ახსნა (ქართ.)</label><input id="fw-expl" type="text" placeholder="gehen ნიშნავს..." value="${word?.short_explanation||word?.note||''}"></div>
    </div>

    <!-- ④ NOUN fields (shown if noun) -->
    <div id="fw-noun-sec">
      <div class="adm-section-lbl">④ არსებითი სახელი</div>
      <div class="adm-form-grid">
        <div class="adm-field"><label>არტიკლი</label>
          <select id="fw-article">
            <option value="">— არ არის —</option>
            ${['der','die','das'].map(a=>`<option value="${a}" ${word?.article===a?'selected':''}>${a}</option>`).join('')}
          </select>
        </div>
        <div class="adm-field"><label>სქესი</label>
          <select id="fw-gender">
            <option value="">—</option>
            ${[['m','მამრობითი (m)'],['f','მდედრობითი (f)'],['n','საშუალო (n)']].map(([v,l])=>`<option value="${v}" ${word?.gender===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="adm-field"><label>მრავლობითი</label><input id="fw-plural" type="text" placeholder="Häuser" value="${word?.plural||''}"></div>
      </div>
    </div>

    <!-- ⑤ VERB fields (shown if verb) -->
    <div id="fw-verb-sec" style="display:none">
      <div class="adm-section-lbl">⑤ ზმნა — სპრიაება</div>
      <div class="adm-form-grid">
        <div class="adm-field"><label>ტიპი</label>
          <select id="fw-vtype">
            <option value="regular"   ${verbD.type==='regular'?'selected':''}>regular (წესიერი)</option>
            <option value="irregular" ${verbD.type==='irregular'?'selected':''}>irregular (არაწესიერი)</option>
          </select>
        </div>
        <div class="adm-field"><label>დამხმარე ზმნა</label>
          <select id="fw-aux">
            <option value="haben" ${verbD.auxiliary==='haben'?'selected':''}>haben</option>
            <option value="sein"  ${verbD.auxiliary==='sein' ?'selected':''}>sein</option>
          </select>
        </div>
        <div class="adm-field"><label>Partizip II</label><input id="fw-part" placeholder="gegangen" value="${verbD.perfect?.participle||''}"></div>
      </div>
      <div class="adm-conj-table">
        <div class="adm-conj-hdr"><span></span><span>Präsens</span><span>Präteritum</span></div>
        ${conjRow('ich',       'ich',      verbD.present, verbD.preterite)}
        ${conjRow('du',        'du',       verbD.present, verbD.preterite)}
        ${conjRow('er/sie/es', 'er_sie_es',verbD.present, verbD.preterite)}
        ${conjRow('wir',       'wir',      verbD.present, verbD.preterite)}
        ${conjRow('ihr',       'ihr',      verbD.present, verbD.preterite)}
        ${conjRow('sie/Sie',   'sie_Sie',  verbD.present, verbD.preterite)}
      </div>
    </div>

    <!-- ⑥ EXAMPLES -->
    <div class="adm-section-lbl">⑥ მაგალითები</div>
    <div class="adm-ex-block">
      <div class="adm-ex-num">მაგალითი 1 (მთავარი)</div>
      <div class="adm-form-grid">
        <div class="adm-field" style="grid-column:1/-1"><label>წინადადება</label><input id="fw-ef1" placeholder="Ich gehe heute zur Arbeit." value="${pEx.sentence||word?.example_foreign||''}"></div>
        <div class="adm-field"><label>ფონეტიკა</label><input id="fw-ep1" placeholder="/ɪç ˈɡeːə.../" value="${pEx.phonetic||word?.example_phonetic||''}"></div>
        <div class="adm-field"><label>ქართული</label><input id="fw-eg1" placeholder="მე დღეს სამსახურში მივდივარ." value="${pEx.translation||word?.example_georgian||''}"></div>
      </div>
      <div class="adm-ex-num">მაგალითი 2</div>
      <div class="adm-form-grid">
        <div class="adm-field" style="grid-column:1/-1"><label>წინადადება</label><input id="fw-ef2" placeholder="Sie geht in den Park." value="${ex2.sentence||''}"></div>
        <div class="adm-field"><label>ფონეტიკა</label><input id="fw-ep2" placeholder="/ziː ˈɡeːt.../" value="${ex2.phonetic||''}"></div>
        <div class="adm-field"><label>ქართული</label><input id="fw-eg2" placeholder="ის პარკში მიდის." value="${ex2.translation||''}"></div>
      </div>
    </div>

    <!-- ⑦ GRAMMAR NOTES -->
    <div class="adm-section-lbl">⑦ გრამატიკული შენიშვნა</div>
    <div class="adm-form-grid">
      <div class="adm-field"><label>თემა</label><input id="fw-gt1" placeholder="Perfekt" value="${gr1.topic||''}"></div>
      <div class="adm-field" style="grid-column:1/-1"><label>ახსნა</label><input id="fw-ge1" placeholder="gehen Perfekt-ში იყენებს sein-ს" value="${gr1.explanation||''}"></div>
      <div class="adm-field" style="grid-column:1/-1"><label>მაგალითი</label><input id="fw-gex1" placeholder="Ich bin nach Hause gegangen." value="${gr1.example||''}"></div>
    </div>

    <div class="adm-form-actions" style="margin-top:20px">
      <button class="adm-btn adm-btn-ghost" id="fw-cancel">გაუქმება</button>
      <button class="adm-btn adm-btn-primary" id="fw-save">${isEdit?'შენახვა':'დამატება'}</button>
    </div>
    <div id="fw-error" class="adm-error"></div>
  </div>`;

  wrap.scrollIntoView({ behavior:'smooth', block:'start' });

  /* show/hide noun vs verb sections */
  function _toggleType() {
    const t = document.getElementById('fw-type').value;
    document.getElementById('fw-noun-sec').style.display = t==='noun' ? '' : 'none';
    document.getElementById('fw-verb-sec').style.display = t==='verb' ? '' : 'none';
  }
  _toggleType();
  document.getElementById('fw-type').addEventListener('change', _toggleType);

  document.getElementById('fw-cancel').addEventListener('click', ()=>{ wrap.innerHTML=''; });

  document.getElementById('fw-save').addEventListener('click', async ()=>{
    const btn   = document.getElementById('fw-save');
    const errEl = document.getElementById('fw-error');
    errEl.textContent = '';

    const lang  = document.getElementById('fw-lang').value;
    const w     = document.getElementById('fw-word').value.trim();
    const type  = document.getElementById('fw-type').value;
    const lv    = document.getElementById('fw-level').value;
    const ipa   = document.getElementById('fw-ipa').value.trim()   || null;
    const syl   = document.getElementById('fw-syl').value.trim()   || null;
    const tr    = document.getElementById('fw-trans').value.trim();
    const altsV = document.getElementById('fw-alts').value.split(',').map(s=>s.trim()).filter(Boolean);
    const def   = document.getElementById('fw-def').value.trim()   || null;
    const expl  = document.getElementById('fw-expl').value.trim()  || null;
    const art   = document.getElementById('fw-article')?.value || null;
    const gender= document.getElementById('fw-gender')?.value  || null;
    const plural= document.getElementById('fw-plural')?.value.trim() || null;

    if (!w)  { errEl.textContent='შეიყვანე სიტყვა';   return; }
    if (!tr) { errEl.textContent='შეიყვანე თარგმანი'; return; }

    /* build examples */
    const examples = [];
    const ef1=document.getElementById('fw-ef1').value.trim();
    if (ef1) examples.push({ sentence:ef1, phonetic:document.getElementById('fw-ep1').value.trim(), translation:document.getElementById('fw-eg1').value.trim(), level:lv, is_primary:true });
    const ef2=document.getElementById('fw-ef2').value.trim();
    if (ef2) examples.push({ sentence:ef2, phonetic:document.getElementById('fw-ep2').value.trim(), translation:document.getElementById('fw-eg2').value.trim(), level:lv, is_primary:false });

    /* build grammar notes */
    const grammar_notes = [];
    const gt1=document.getElementById('fw-gt1').value.trim();
    if (gt1) grammar_notes.push({ topic:gt1, explanation:document.getElementById('fw-ge1').value.trim(), example:document.getElementById('fw-gex1').value.trim() });

    /* build verb_data */
    let verb_data = null;
    if (type==='verb') {
      const keys=['ich','du','er_sie_es','wir','ihr','sie_Sie'];
      const present={}, preterite={};
      keys.forEach(k=>{ present[k]=document.getElementById('fw-p-'+k)?.value.trim()||''; preterite[k]=document.getElementById('fw-pt-'+k)?.value.trim()||''; });
      verb_data = {
        type:      document.getElementById('fw-vtype').value,
        auxiliary: document.getElementById('fw-aux').value,
        present, preterite,
        perfect:   { auxiliary:document.getElementById('fw-aux').value, participle:document.getElementById('fw-part').value.trim() }
      };
    }

    const payload = {
      language: lang, word: w, word_type: type, level: lv,
      article: art||null, gender: gender||null, plural: plural||null,
      ipa, phonetic: ipa,
      syllables: syl ? syl.split(',').map(s=>s.trim()) : null,
      translation: tr, translation_primary: tr,
      alternatives: altsV,
      definition: def, short_explanation: expl, note: expl,
      verb_data: verb_data ? JSON.stringify(verb_data) : null,
      examples: JSON.stringify(examples),
      grammar_notes: JSON.stringify(grammar_notes),
      example_foreign:  examples[0]?.sentence    || null,
      example_phonetic: examples[0]?.phonetic    || null,
      example_georgian: examples[0]?.translation || null,
    };

    btn.disabled=true; btn.textContent='⏳…';
    let error;
    if (isEdit) {
      ({error} = await sb.from('words').update(payload).eq('id', word.id));
    } else {
      ({error} = await sb.from('words').insert(payload));
    }
    btn.disabled=false; btn.textContent=isEdit?'შენახვა':'დამატება';

    if (error) { errEl.textContent=error.code==='23505'?'ეს სიტყვა უკვე არსებობს':error.message; return; }
    lsSet('words_cache', null); await loadWords();
    toast(isEdit?'✅ სიტყვა განახლდა':'✅ სიტყვა დაემატა');
    _adminLang=lang; wrap.innerHTML=''; renderAdminWords();
  });
}

function _j(v){ if(!v) return null; if(typeof v==='object') return v; try{return JSON.parse(v);}catch{return null;} }



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
