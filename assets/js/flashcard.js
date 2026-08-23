/* ══════════════════════════════════════════════════════════════
   LinguaFlow · flashcard.js v3
   3D Flip · Premium Design · Word Status · Learned · Review
══════════════════════════════════════════════════════════════ */

const LANG_FLAGS = { de:'🇩🇪', en:'🇬🇧', fr:'🇫🇷', es:'🇪🇸', ru:'🇷🇺' };
const TTS_LANGS  = { de:'de-DE', en:'en-US', fr:'fr-FR', es:'es-ES', ru:'ru-RU' };
let _fcFlipped   = false;

/* ─── Word Status ────────────────────────────────────────── */
function getWordStatus(wordId) { return ls('wst_'+S.lang+'_'+wordId); }
function setWordStatus(wordId, status) {
  if (!status) localStorage.removeItem('lf_wst_'+S.lang+'_'+wordId);
  else lsSet('wst_'+S.lang+'_'+wordId, status);
  if (S.user && wordId)
    sb.from('word_progress').upsert({ user_id:S.user.id, word_id:wordId,
      status:status||'none', reviewed_at:new Date().toISOString()
    }, {onConflict:'user_id,word_id'}).then(()=>{});
}
function _wstForLang(lang, wid) {
  try { return JSON.parse(localStorage.getItem('lf_wst_'+lang+'_'+wid)); } catch { return null; }
}
function getLearnedWords(lang) { return getVocab(lang).filter(w=>_wstForLang(lang,w.id)==='easy'); }
function getReviewWords(lang)  { return getVocab(lang).filter(w=>{ const s=_wstForLang(lang,w.id); return s==='hard'||s==='medium'; }); }

/* ─── TTS ────────────────────────────────────────────────── */
function speakWord(text, lang) {
  if (!text||!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=TTS_LANGS[lang]||'de-DE'; u.rate=0.82;
  speechSynthesis.speak(u);
}

/* ─── Start ──────────────────────────────────────────────── */
function startFlashcards(count=10, pool=null) {
  const vocab     = pool||getVocab(S.lang);
  const unlearned = vocab.filter(w=>getWordStatus(w.id)!=='easy');
  const learned   = vocab.filter(w=>getWordStatus(w.id)==='easy');
  const queue     = pool ? vocab : [...unlearned,...learned].slice(0,count);
  if (!queue.length) { toast('სიტყვები ვერ მოიძებნა'); return; }
  S.fcQueue=queue; S.fcIndex=0; _fcFlipped=false;
  document.getElementById('fc-overlay').classList.add('active');
  _renderFC3(true);
}

/* ══════════════════════════════════════════════════════════
   FC3 RENDER
══════════════════════════════════════════════════════════ */
function _renderFC3(animate=false) {
  const word=S.fcQueue[S.fcIndex], idx=S.fcIndex, total=S.fcQueue.length;
  const lang=S.lang, stat=getWordStatus(word.id);
  document.getElementById('fc-prog').style.width=Math.round((idx/total)*100)+'%';
  document.getElementById('fc-counter').textContent=`${idx+1} / ${total}`;

  const sparks=[0,1,2,3,4].map(i=>`<div class="fc3-spark" style="left:${12+i*18}%;top:${10+i*14}%;animation-delay:${i*0.35}s">✦</div>`).join('');

  document.getElementById('fc3-front').innerHTML=`
    <div class="fc3-sparks">${sparks}</div>
    <div class="fc3-top">
      <div class="fc3-lv lv-${word.lv.toLowerCase()}">${word.lv}</div>
      <div class="fc3-flag-orb"><div class="fc3-flag-inner">${LANG_FLAGS[lang]||'🌐'}</div></div>
      <button class="fc3-icon-btn" id="fc3-snd-f">🔊</button>
    </div>
    <button class="fc3-arrow fc3-prev" id="fc3-prev" ${idx===0?'disabled':''}>‹</button>
    <button class="fc3-arrow fc3-next" id="fc3-next" ${idx===total-1?'disabled':''}>›</button>
    <div class="fc3-word-block">
      ${word.a?`<div class="fc3-article">${word.a}</div>`:''}
      <div class="fc3-word">${word.w}</div>
      ${word.ph?`<div class="fc3-phonetic">${word.ph}</div>`:''}
    </div>
    ${word.cat?`<div class="fc3-tag-row"><span class="fc3-tag">🏷 ${word.cat}</span></div>`:''}
    <div class="fc3-glow-divider"></div>
    <div class="fc3-geo-row"><span class="fc3-geo-flag">🇬🇪</span><span class="fc3-geo-word">${word.t}</span></div>
    <div class="fc3-bottom">
      <button class="fc3-star-btn${stat==='easy'?' fc3-starred':''}" id="fc3-star">${stat==='easy'?'⭐':'☆'}</button>
      <div class="fc3-counter">${idx+1} / ${total}</div>
      <button class="fc3-flip-btn" id="fc3-flip">↻ გადატრიალება</button>
    </div>`;

  document.getElementById('fc3-back').innerHTML=`
    <div class="fc3-top">
      <div class="fc3-lv lv-${word.lv.toLowerCase()}">${word.lv}</div>
      <div class="fc3-chat-orb">💬</div>
      <button class="fc3-icon-btn" id="fc3-snd-g">🔊</button>
    </div>
    <div class="fc3-geo-large">${word.t}</div>
    <div class="fc3-word-sub">${LANG_FLAGS[lang]} ${word.a?word.a+' ':''}${word.w}</div>
    ${word.ef?`
    <div class="fc3-section-lbl">— EXAMPLE —</div>
    <div class="fc3-example-box">
      <div class="fc3-ef">${word.ef}</div>
      ${word.eg?`<div class="fc3-eg">${word.eg}</div>`:''}
      <button class="fc3-ex-snd" id="fc3-snd-ex">🔊</button>
    </div>`:''}
    ${word.note?`<div class="fc3-section-lbl">— NOTE —</div><div class="fc3-note-box">💡 ${word.note}</div>`:''}`;

  _fcFlipped=false;
  const card=document.getElementById('fc3-card');
  card.classList.remove('flipped');
  document.getElementById('fc-rating').style.display='none';
  _bindFC3(word, idx, total, lang);

  if (animate) {
    card.classList.add('fc3-enter');
    setTimeout(()=>card.classList.remove('fc3-enter'),450);
  }
}

function _bindFC3(word, idx, total, lang) {
  document.getElementById('fc3-snd-f')?.addEventListener('click',e=>{ e.stopPropagation(); speakWord(word.w,lang); });
  document.getElementById('fc3-snd-g')?.addEventListener('click',e=>{ e.stopPropagation(); speakWord(word.t,'ka'); });
  document.getElementById('fc3-snd-ex')?.addEventListener('click',e=>{ e.stopPropagation(); speakWord(word.ef,lang); });
  document.getElementById('fc3-flip')?.addEventListener('click',e=>{ e.stopPropagation(); _flipCard(); });
  document.getElementById('fc3-star')?.addEventListener('click',e=>{
    e.stopPropagation();
    const s=getWordStatus(word.id);
    setWordStatus(word.id, s==='easy'?null:'easy');
    if (s!=='easy') { addXp(20,'star'); toast('⭐ ნასწავლ სიტყვებში!'); }
    _renderFC3();
  });
  document.getElementById('fc3-prev')?.addEventListener('click',e=>{ e.stopPropagation(); if(S.fcIndex>0){S.fcIndex--;_renderFC3(true);} });
  document.getElementById('fc3-next')?.addEventListener('click',e=>{ e.stopPropagation(); if(S.fcIndex<S.fcQueue.length-1){S.fcIndex++;_renderFC3(true);} });
  document.getElementById('fc3-front')?.addEventListener('click', _flipCard);
}

function _flipCard() {
  if (_fcFlipped) return;
  _fcFlipped=true;
  document.getElementById('fc3-card').classList.add('flipped');
  document.getElementById('fc-rating').style.display='flex';
}

/* ─── Rate ───────────────────────────────────────────────── */
function rateWord(rating) {
  const word=S.fcQueue[S.fcIndex];
  if (!word) return;
  setWordStatus(word.id, rating);
  if (rating==='easy') {
    const prog=getProgress(), key=S.lang+'_'+word.id;
    if (!prog[key]) { prog[key]={date:new Date().toISOString()}; lsSet('progress',prog); }
    addXp(20,'easy'); toast('✅ ნასწავლ სიტყვებში! +20 XP');
  } else if (rating==='medium') { addXp(5,'med'); toast('🔄 გასამეობელში +5 XP'); }
  else { addXp(2,'hard'); toast('↩ გასამეობელში +2 XP'); }
  S.fcIndex++;
  if (S.fcIndex>=S.fcQueue.length) _showSummary();
  else _renderFC3(true);
}

function _showSummary() {
  const total=S.fcQueue.length;
  const easy=S.fcQueue.filter(w=>getWordStatus(w.id)==='easy').length;
  const medium=S.fcQueue.filter(w=>getWordStatus(w.id)==='medium').length;
  const hard=S.fcQueue.filter(w=>getWordStatus(w.id)==='hard').length;
  const xp=easy*20+medium*5+hard*2;
  document.getElementById('fc-prog').style.width='100%';
  document.getElementById('fc-rating').style.display='none';
  document.getElementById('fc3-card').classList.remove('flipped');
  document.getElementById('fc3-front').innerHTML=`
    <div class="fc3-summary">
      <div class="fc3-sum-emoji">${easy>=total*.7?'🏆':'💪'}</div>
      <div class="fc3-sum-title">${easy>=total*.7?'შესანიშნავია!':'კარგი სესია!'}</div>
      <div class="fc3-sum-stats">
        <div class="fc3-sum-s easy"><span>${easy}</span><small>✅ ადვილი</small></div>
        <div class="fc3-sum-s medium"><span>${medium}</span><small>🔄 ისე რა</small></div>
        <div class="fc3-sum-s hard"><span>${hard}</span><small>↩ რთული</small></div>
      </div>
      <div class="fc3-sum-xp">+${xp} XP</div>
      <button class="fc3-sum-btn" id="fc3-done">დახურვა ✓</button>
    </div>`;
  document.getElementById('fc3-back').innerHTML='';
  document.getElementById('fc3-done').addEventListener('click', closeFCOverlay);
}

function closeFCOverlay() {
  document.getElementById('fc-overlay').classList.remove('active');
  document.getElementById('fc-rating').style.display='none';
  document.getElementById('fc3-card').classList.remove('flipped');
  document.getElementById('fc3-front').innerHTML='';
  document.getElementById('fc3-back').innerHTML='';
  _fcFlipped=false;
  if (S.page==='home')       renderHome();
  if (S.page==='learned')    renderLearned();
  if (S.page==='review')     renderReview();
  if (S.page==='statistics') renderStatistics();
}

/* ══════════════════════════════════════════════════════════
   LEARNED PAGE
══════════════════════════════════════════════════════════ */
function renderLearned() {
  const lang=LANGS[S.lang]||LANGS.de, learned=getLearnedWords(S.lang);
  const tabs=Object.entries(LANGS).map(([c,l])=>`
    <button class="level-tab${S.lang===c?' active':''}" data-lang="${c}">${l.flag} ${l.name}</button>`).join('');
  const cards=learned.length
    ? learned.map(w=>`<div class="word-card lrn-card">${w.a?`<div class="word-card-article">${w.a}</div>`:''}<div class="word-card-word">✅ ${w.w}</div><div class="word-card-translation">${w.t}</div><div class="word-card-level">${w.lv}</div><button class="lrn-unlearn" data-id="${w.id}">↩ გასამეობელში</button></div>`).join('')
    : `<div class="lrn-empty"><div style="font-size:48px;margin-bottom:16px">📚</div><div style="font-size:18px;font-weight:700;margin-bottom:8px">ნასწავლი სიტყვები ჯერ არ არის</div><div style="color:var(--muted);font-size:14px">ფლეშქარდში "✅ ადვილი" დააჭირე</div></div>`;
  document.getElementById('page-learned').innerHTML=`
    <div class="page-header"><h1>✅ ნასწავლი სიტყვები</h1><p>${lang.flag} ${lang.name} · ${learned.length} სიტყვა</p></div>
    <div class="level-tabs" id="lrn-tabs">${tabs}</div>
    ${learned.length?`<div class="lrn-actions"><button class="adm-btn adm-btn-primary" id="lrn-go">▶ სესიის დაწყება (${learned.length})</button></div>`:''}
    <div class="word-grid">${cards}</div>`;
  document.getElementById('lrn-tabs').addEventListener('click',e=>{ const b=e.target.closest('[data-lang]'); if(b){S.lang=b.dataset.lang;updateHeader();renderLearned();}});
  document.getElementById('lrn-go')?.addEventListener('click',()=>startFlashcards(learned.length,learned));
  document.getElementById('page-learned').addEventListener('click',e=>{ const b=e.target.closest('.lrn-unlearn'); if(b){setWordStatus(b.dataset.id,'medium');toast('🔄 გასამეობელში');renderLearned();}});
}

/* ══════════════════════════════════════════════════════════
   REVIEW PAGE
══════════════════════════════════════════════════════════ */
function renderReview() {
  const lang=LANGS[S.lang]||LANGS.de, review=getReviewWords(S.lang);
  const hard=review.filter(w=>_wstForLang(S.lang,w.id)==='hard');
  const medium=review.filter(w=>_wstForLang(S.lang,w.id)==='medium');
  const tabs=Object.entries(LANGS).map(([c,l])=>`
    <button class="level-tab${S.lang===c?' active':''}" data-lang="${c}">${l.flag} ${l.name}</button>`).join('');
  const mkCards=(ws,cls)=>ws.map(w=>`<div class="word-card rev-card ${cls}">${w.a?`<div class="word-card-article">${w.a}</div>`:''}<div class="word-card-word">${w.w}</div><div class="word-card-translation">${w.t}</div><div class="word-card-level">${w.lv}</div></div>`).join('');
  document.getElementById('page-review').innerHTML=`
    <div class="page-header"><h1>🔄 გასამეობელი</h1><p>${lang.flag} ${lang.name} · ${review.length} სიტყვა</p></div>
    <div class="level-tabs" id="rev-tabs">${tabs}</div>
    ${review.length?`
    <div class="rev-stats">
      <div class="rev-stat rev-hard"><div class="rev-stat-val">${hard.length}</div><div class="rev-stat-lbl">↩ ძალიან რთული</div></div>
      <div class="rev-stat rev-medium"><div class="rev-stat-val">${medium.length}</div><div class="rev-stat-lbl">🔄 ისე რა</div></div>
    </div>
    <div class="rev-actions">
      <button class="adm-btn adm-btn-primary" id="rev-all">▶ ყველა (${review.length})</button>
      ${hard.length?`<button class="adm-btn rev-btn-hard" id="rev-hard">↩ მხოლოდ რთული (${hard.length})</button>`:''}
    </div>
    ${hard.length?`<div class="rev-group-label">↩ ძალიან რთული</div><div class="word-grid">${mkCards(hard,'card-hard')}</div>`:''}
    ${medium.length?`<div class="rev-group-label" style="margin-top:20px">🔄 ისე რა</div><div class="word-grid">${mkCards(medium,'card-medium')}</div>`:''}
    `:`<div class="lrn-empty"><div style="font-size:48px;margin-bottom:16px">🎉</div><div style="font-size:18px;font-weight:700">გასამეობელი სიტყვა არ არის!</div></div>`}`;
  document.getElementById('rev-tabs').addEventListener('click',e=>{ const b=e.target.closest('[data-lang]'); if(b){S.lang=b.dataset.lang;updateHeader();renderReview();}});
  document.getElementById('rev-all')?.addEventListener('click',()=>startFlashcards(review.length,review));
  document.getElementById('rev-hard')?.addEventListener('click',()=>startFlashcards(hard.length,hard));
}
