/* ══════════════════════════════════════════════════════════════
   LinguaFlow · flashcard.js v4  —  Premium Design
   3D Flip fixed · Full-width card · Example phonetics · TTS
══════════════════════════════════════════════════════════════ */

const LANG_FLAGS = { de:'🇩🇪', en:'🇬🇧', fr:'🇫🇷', es:'🇪🇸', ru:'🇷🇺' };
const TTS_LANGS  = { de:'de-DE', en:'en-US', fr:'fr-FR', es:'es-ES', ru:'ru-RU', ka:'ka-GE' };
let _fcFlipped = false;

/* ── Word Status ─────────────────────────────────────────── */
function getWordStatus(wordId) { return ls('wst_'+S.lang+'_'+wordId); }
function setWordStatus(wordId, status) {
  if (!status) localStorage.removeItem('lf_wst_'+S.lang+'_'+wordId);
  else lsSet('wst_'+S.lang+'_'+wordId, status);
  if (S.user && wordId)
    sb.from('word_progress').upsert({
      user_id:S.user.id, word_id:wordId,
      status:status||'none', reviewed_at:new Date().toISOString()
    },{onConflict:'user_id,word_id'}).then(()=>{});
}
function _wstForLang(lang,wid){
  try{return JSON.parse(localStorage.getItem('lf_wst_'+lang+'_'+wid));}catch{return null;}
}
function getLearnedWords(lang){return getVocab(lang).filter(w=>_wstForLang(lang,w.id)==='easy');}
function getReviewWords(lang) {return getVocab(lang).filter(w=>{const s=_wstForLang(lang,w.id);return s==='hard'||s==='medium';});}

/* ── TTS ─────────────────────────────────────────────────── */
function speakWord(text, lang){
  if (!text||!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = TTS_LANGS[lang] || 'de-DE';
  u.rate = 0.8; u.pitch = 1;
  speechSynthesis.speak(u);
}

/* ── Start ───────────────────────────────────────────────── */
function startFlashcards(count=10, pool=null){
  const vocab     = pool || getVocab(S.lang);
  const unlearned = vocab.filter(w=>getWordStatus(w.id)!=='easy');
  const learned   = vocab.filter(w=>getWordStatus(w.id)==='easy');
  const queue     = pool ? [...vocab] : [...unlearned,...learned].slice(0,count);
  if (!queue.length){ toast('სიტყვები ვერ მოიძებნა'); return; }
  S.fcQueue=queue; S.fcIndex=0; _fcFlipped=false;
  document.getElementById('fc-overlay').classList.add('active');
  _bindNavBtns();
  _renderFC(true);
}

function _bindNavBtns(){
  ['fc3-prev','fc3-next'].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
  });
  document.getElementById('fc3-prev').addEventListener('click', ()=>{
    if (S.fcIndex>0){ S.fcIndex--; _renderFC(true,'left'); }
  });
  document.getElementById('fc3-next').addEventListener('click', ()=>{
    if (S.fcIndex<S.fcQueue.length-1){ S.fcIndex++; _renderFC(true,'right'); }
  });
}

/* ══════════════════════════════════════════════════════════
   RENDER
══════════════════════════════════════════════════════════ */
function _renderFC(animate=false, dir='right'){
  const word  = S.fcQueue[S.fcIndex];
  const idx   = S.fcIndex;
  const total = S.fcQueue.length;
  const lang  = S.lang;
  const stat  = getWordStatus(word.id);

  /* progress + counter */
  document.getElementById('fc-prog').style.width = Math.round((idx/total)*100)+'%';
  document.getElementById('fc-counter').textContent = `${idx+1} / ${total}`;

  /* nav button states */
  const pb = document.getElementById('fc3-prev');
  const nb = document.getElementById('fc3-next');
  if (pb) pb.disabled = (idx === 0);
  if (nb) nb.disabled = (idx === total-1);

  /* sparkles */
  const sparks = [0,1,2,3,4,5].map(i=>
    `<span class="fc-spark" style="left:${8+i*15}%;top:${10+i*12}%;animation-delay:${i*.3}s;font-size:${8+i%3*3}px">✦</span>`
  ).join('');

  /* ── FRONT ─────────────────────────────────────────────── */
  document.getElementById('fc3-front').innerHTML = `
    <div class="fc-sparks" aria-hidden="true">${sparks}</div>

    <div class="fc-top">
      <span class="fc-lv lv-${word.lv.toLowerCase()}">${word.lv}</span>
      <div class="fc-flag-orb">
        <span class="fc-flag-inner">${LANG_FLAGS[lang]||'🌐'}</span>
        <div class="fc-flag-ring"></div>
      </div>
      <button class="fc-snd-btn" id="fc-snd-word" title="სიტყვის გამოთქვა">🔊</button>
    </div>

    <div class="fc-word-zone">
      ${word.a ? `<div class="fc-article">${word.a}</div>` : ''}
      <div class="fc-word">${word.w}</div>
      ${word.ph ? `<div class="fc-phonetic">${word.ph}</div>` : ''}
      ${word.cat ? `<div class="fc-tag-wrap"><span class="fc-tag">🏷 ${word.cat}</span></div>` : ''}
    </div>

    <div class="fc-shine-divider"></div>

    <div class="fc-geo-row">
      <span class="fc-geo-flag">🇬🇪</span>
      <span class="fc-geo-word">${word.t}</span>
    </div>

    <div class="fc-bottom">
      <button class="fc-star-btn ${stat==='easy'?'starred':''}" id="fc-star">
        ${stat==='easy'?'⭐':'☆'}
      </button>
      <button class="fc-flip-btn" id="fc-flip">
        <span class="fc-flip-icon">↻</span> გადატრიალება
      </button>
    </div>
  `;

  /* ── BACK ───────────────────────────────────────────────── */
  document.getElementById('fc3-back').innerHTML = `
    <div class="fc-top">
      <span class="fc-lv lv-${word.lv.toLowerCase()}">${word.lv}</span>
      <div class="fc-chat-orb">💬</div>
      <button class="fc-snd-btn" id="fc-snd-geo" title="ქართული წარმოთქვა">🔊</button>
    </div>

    <div class="fc-back-hero">
      <div class="fc-geo-large">${word.t}</div>
      <div class="fc-orig-word">
        ${LANG_FLAGS[lang]}&nbsp;
        ${word.a ? `<em class="fc-orig-art">${word.a}</em> ` : ''}${word.w}
      </div>
      ${word.ph ? `<div class="fc-orig-ph">${word.ph}</div>` : ''}
    </div>

    ${word.ef ? `
    <div class="fc-ex-wrap">
      <div class="fc-ex-label">✦ EXAMPLE ✦</div>
      <div class="fc-ex-box">
        <button class="fc-ex-snd" id="fc-snd-ex" title="მაგალითის გამოთქვა">🔊</button>
        <div class="fc-ef">${word.ef}</div>
        ${word.ep ? `<div class="fc-ep">${word.ep}</div>` : ''}
        ${word.eg ? `<div class="fc-eg">${word.eg}</div>` : ''}
      </div>
    </div>` : ''}

    ${word.note ? `<div class="fc-note">💡 ${word.note}</div>` : ''}
  `;

  /* reset flip */
  _fcFlipped = false;
  const card = document.getElementById('fc3-card');
  card.classList.remove('flipped');
  document.getElementById('fc-rating').style.display = 'none';

  _bindFC(word, lang);

  if (animate){
    const cls = dir==='left' ? 'fc-from-left' : 'fc-from-right';
    card.classList.add(cls);
    setTimeout(()=> card.classList.remove(cls), 430);
  }
}

/* ── Bind events ─────────────────────────────────────────── */
function _bindFC(word, lang){
  document.getElementById('fc-snd-word')?.addEventListener('click', e=>{ e.stopPropagation(); speakWord(word.w, lang); });
  document.getElementById('fc-snd-geo')?.addEventListener('click',  e=>{ e.stopPropagation(); speakWord(word.t, 'ka'); });
  document.getElementById('fc-snd-ex')?.addEventListener('click',   e=>{ e.stopPropagation(); speakWord(word.ef, lang); });
  document.getElementById('fc-flip')?.addEventListener('click',     e=>{ e.stopPropagation(); _flipCard(); });
  document.getElementById('fc-star')?.addEventListener('click',     e=>{
    e.stopPropagation();
    const s = getWordStatus(word.id);
    setWordStatus(word.id, s==='easy' ? null : 'easy');
    if (s!=='easy'){ addXp(20,'star'); toast('⭐ ნასწავლ სიტყვებში!'); }
    _renderFC();
  });
  /* tap front to flip */
  document.getElementById('fc3-front')?.addEventListener('click', _flipCard);
}

function _flipCard(){
  if (_fcFlipped) return;
  _fcFlipped = true;
  document.getElementById('fc3-card').classList.add('flipped');
  document.getElementById('fc-rating').style.display = 'flex';
}

/* ── Rate ───────────────────────────────────────────────── */
function rateWord(rating){
  const word = S.fcQueue[S.fcIndex];
  if (!word) return;
  setWordStatus(word.id, rating);
  if (rating==='easy'){
    const prog=getProgress(), key=S.lang+'_'+word.id;
    if (!prog[key]){ prog[key]={date:new Date().toISOString()}; lsSet('progress',prog); }
    addXp(20,'easy'); toast('✅ ნასწავლ სიტყვებში! +20 XP');
  } else if (rating==='medium'){ addXp(5,'med'); toast('🔄 გასამეობელში +5 XP'); }
  else { addXp(2,'hard'); toast('↩ გასამეობელში +2 XP'); }
  S.fcIndex++;
  if (S.fcIndex >= S.fcQueue.length) _showSummary();
  else _renderFC(true,'right');
}

/* ── Summary ────────────────────────────────────────────── */
function _showSummary(){
  const total = S.fcQueue.length;
  const easy  = S.fcQueue.filter(w=>getWordStatus(w.id)==='easy').length;
  const med   = S.fcQueue.filter(w=>getWordStatus(w.id)==='medium').length;
  const hard  = S.fcQueue.filter(w=>getWordStatus(w.id)==='hard').length;
  const xp    = easy*20 + med*5 + hard*2;
  document.getElementById('fc-prog').style.width = '100%';
  document.getElementById('fc-rating').style.display = 'none';
  document.getElementById('fc3-card').classList.remove('flipped');
  document.getElementById('fc3-front').innerHTML = `
    <div class="fc-summary">
      <div class="fc-sum-trophy">${easy>=total*.7?'🏆':'💪'}</div>
      <div class="fc-sum-title">${easy>=total*.7?'შესანიშნავია!':'კარგი სესია!'}</div>
      <div class="fc-sum-row">
        <div class="fc-sum-s c-easy"><div class="fc-sum-n">${easy}</div><div class="fc-sum-l">✅ ადვილი</div></div>
        <div class="fc-sum-s c-med"> <div class="fc-sum-n">${med}</div> <div class="fc-sum-l">🔄 ისე რა</div></div>
        <div class="fc-sum-s c-hard"><div class="fc-sum-n">${hard}</div><div class="fc-sum-l">↩ რთული</div></div>
      </div>
      <div class="fc-sum-xp">+${xp} XP</div>
      <button class="fc-sum-btn" id="fc-done">დახურვა ✓</button>
    </div>`;
  document.getElementById('fc3-back').innerHTML = '';
  document.getElementById('fc3-done').addEventListener('click', closeFCOverlay);
}

function closeFCOverlay(){
  document.getElementById('fc-overlay').classList.remove('active');
  document.getElementById('fc-rating').style.display = 'none';
  document.getElementById('fc3-card').classList.remove('flipped');
  document.getElementById('fc3-front').innerHTML = '';
  document.getElementById('fc3-back').innerHTML  = '';
  _fcFlipped = false;
  if (S.page==='home')       renderHome();
  if (S.page==='learned')    renderLearned();
  if (S.page==='review')     renderReview();
  if (S.page==='statistics') renderStatistics();
}

/* ══════════════════════════════════════════════════════════
   LEARNED + REVIEW
══════════════════════════════════════════════════════════ */
function renderLearned(){
  const lang=LANGS[S.lang]||LANGS.de, learned=getLearnedWords(S.lang);
  const tabs=Object.entries(LANGS).map(([c,l])=>`<button class="level-tab${S.lang===c?' active':''}" data-lang="${c}">${l.flag} ${l.name}</button>`).join('');
  const cards=learned.length
    ?learned.map(w=>`<div class="word-card lrn-card">${w.a?`<div class="word-card-article">${w.a}</div>`:''}<div class="word-card-word">✅ ${w.w}</div><div class="word-card-translation">${w.t}</div><div class="word-card-level">${w.lv}</div><button class="lrn-unlearn" data-id="${w.id}">↩ გასამეობელში</button></div>`).join('')
    :`<div class="lrn-empty"><div style="font-size:48px;margin-bottom:16px">📚</div><div style="font-size:18px;font-weight:700;margin-bottom:8px">ნასწავლი სიტყვები ჯერ არ არის</div><div style="color:var(--muted);font-size:14px">ფლეშქარდში "✅ ადვილი" დააჭირე</div></div>`;
  document.getElementById('page-learned').innerHTML=`
    <div class="page-header"><h1>✅ ნასწავლი სიტყვები</h1><p>${lang.flag} ${lang.name} · ${learned.length} სიტყვა</p></div>
    <div class="level-tabs" id="lrn-tabs">${tabs}</div>
    ${learned.length?`<div class="lrn-actions"><button class="adm-btn adm-btn-primary" id="lrn-go">▶ სესიის დაწყება (${learned.length})</button></div>`:''}
    <div class="word-grid">${cards}</div>`;
  document.getElementById('lrn-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b){S.lang=b.dataset.lang;updateHeader();renderLearned();}});
  document.getElementById('lrn-go')?.addEventListener('click',()=>startFlashcards(learned.length,learned));
  document.getElementById('page-learned').addEventListener('click',e=>{const b=e.target.closest('.lrn-unlearn');if(b){setWordStatus(b.dataset.id,'medium');toast('🔄 გასამეობელში');renderLearned();}});
}

function renderReview(){
  const lang=LANGS[S.lang]||LANGS.de, review=getReviewWords(S.lang);
  const hard=review.filter(w=>_wstForLang(S.lang,w.id)==='hard');
  const medium=review.filter(w=>_wstForLang(S.lang,w.id)==='medium');
  const tabs=Object.entries(LANGS).map(([c,l])=>`<button class="level-tab${S.lang===c?' active':''}" data-lang="${c}">${l.flag} ${l.name}</button>`).join('');
  const mkCards=(ws,cls)=>ws.map(w=>`<div class="word-card rev-card ${cls}">${w.a?`<div class="word-card-article">${w.a}</div>`:''}<div class="word-card-word">${w.w}</div><div class="word-card-translation">${w.t}</div><div class="word-card-level">${w.lv}</div></div>`).join('');
  document.getElementById('page-review').innerHTML=`
    <div class="page-header"><h1>🔄 გასამეობელი</h1><p>${lang.flag} ${lang.name} · ${review.length} სიტყვა</p></div>
    <div class="level-tabs" id="rev-tabs">${tabs}</div>
    ${review.length?`
    <div class="rev-stats"><div class="rev-stat rev-hard"><div class="rev-stat-val">${hard.length}</div><div class="rev-stat-lbl">↩ ძ. რთული</div></div><div class="rev-stat rev-medium"><div class="rev-stat-val">${medium.length}</div><div class="rev-stat-lbl">🔄 ისე რა</div></div></div>
    <div class="rev-actions"><button class="adm-btn adm-btn-primary" id="rev-all">▶ ყველა (${review.length})</button>${hard.length?`<button class="adm-btn rev-btn-hard" id="rev-hard">↩ მხოლოდ რთული (${hard.length})</button>`:''}</div>
    ${hard.length?`<div class="rev-group-label">↩ ძალიან რთული</div><div class="word-grid">${mkCards(hard,'card-hard')}</div>`:''}
    ${medium.length?`<div class="rev-group-label" style="margin-top:20px">🔄 ისე რა</div><div class="word-grid">${mkCards(medium,'card-medium')}</div>`:''}
    `:`<div class="lrn-empty"><div style="font-size:48px;margin-bottom:16px">🎉</div><div style="font-size:18px;font-weight:700">გასამეობელი სიტყვა არ არის!</div></div>`}`;
  document.getElementById('rev-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b){S.lang=b.dataset.lang;updateHeader();renderReview();}});
  document.getElementById('rev-all')?.addEventListener('click',()=>startFlashcards(review.length,review));
  document.getElementById('rev-hard')?.addEventListener('click',()=>startFlashcards(hard.length,hard));
}
