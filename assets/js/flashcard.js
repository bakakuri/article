/* ══════════════════════════════════════════════════════════════
   LinguaFlow · flashcard.js v3.1
   3D Flip · Arrows outside card · Word Status · Learned · Review
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

/* ─── TTS ────────────────────────────────────────────────── */
function speakWord(text, lang){
  if (!text||!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=TTS_LANGS[lang]||'de-DE'; u.rate=0.82;
  speechSynthesis.speak(u);
}

/* ─── Start ──────────────────────────────────────────────── */
function startFlashcards(count=10, pool=null){
  const vocab     = pool||getVocab(S.lang);
  const unlearned = vocab.filter(w=>getWordStatus(w.id)!=='easy');
  const learned   = vocab.filter(w=>getWordStatus(w.id)==='easy');
  const queue     = pool ? [...vocab] : [...unlearned,...learned].slice(0,count);
  if (!queue.length){toast('სიტყვები ვერ მოიძებნა');return;}
  S.fcQueue=queue; S.fcIndex=0; _fcFlipped=false;
  document.getElementById('fc-overlay').classList.add('active');
  _initNavBtns();
  _renderFC3(true);
}

/* ── Bind nav buttons once ─────────────────────────────── */
function _initNavBtns(){
  /* clone to remove old listeners */
  ['fc3-prev','fc3-next'].forEach(id=>{
    const old=document.getElementById(id);
    if (!old) return;
    const neo=old.cloneNode(true);
    old.parentNode.replaceChild(neo,old);
  });
  document.getElementById('fc3-prev').addEventListener('click',()=>{
    if (S.fcIndex>0){S.fcIndex--;_renderFC3(true,'left');}
  });
  document.getElementById('fc3-next').addEventListener('click',()=>{
    if (S.fcIndex<S.fcQueue.length-1){S.fcIndex++;_renderFC3(true,'right');}
  });
}

/* ══════════════════════════════════════════════════════════
   RENDER
══════════════════════════════════════════════════════════ */
function _renderFC3(animate=false, dir='right'){
  const word=S.fcQueue[S.fcIndex], idx=S.fcIndex, total=S.fcQueue.length;
  const lang=S.lang, stat=getWordStatus(word.id);

  /* progress */
  document.getElementById('fc-prog').style.width=Math.round((idx/total)*100)+'%';
  document.getElementById('fc-counter').textContent=`${idx+1} / ${total}`;

  /* nav button state */
  const prevBtn=document.getElementById('fc3-prev');
  const nextBtn=document.getElementById('fc3-next');
  if (prevBtn) prevBtn.disabled = idx===0;
  if (nextBtn) nextBtn.disabled = idx===total-1;

  /* ── FRONT ─────────────────────────────────────────── */
  document.getElementById('fc3-front').innerHTML=`
    <div class="fc3-sparks" aria-hidden="true">
      ${[0,1,2,3,4].map(i=>`<span class="fc3-spark" style="left:${14+i*16}%;top:${12+i*13}%;animation-delay:${i*.38}s">✦</span>`).join('')}
    </div>

    <div class="fc3-top">
      <div class="fc3-lv lv-${word.lv.toLowerCase()}">${word.lv}</div>
      <div class="fc3-flag-orb"><span class="fc3-flag-inner">${LANG_FLAGS[lang]||'🌐'}</span></div>
      <button class="fc3-icon-btn" id="fc3-snd-f" title="გამოთქვა">🔊</button>
    </div>

    <div class="fc3-word-zone">
      ${word.a?`<div class="fc3-article">${word.a}</div>`:''}
      <div class="fc3-word">${word.w}</div>
      ${word.ph?`<div class="fc3-phonetic">${word.ph}</div>`:''}
      ${word.cat?`<div class="fc3-tag-row"><span class="fc3-tag">🏷 ${word.cat}</span></div>`:''}
    </div>

    <div class="fc3-glow-divider"></div>

    <div class="fc3-geo-row">
      <span>🇬🇪</span>
      <span class="fc3-geo-word">${word.t}</span>
    </div>

    <div class="fc3-bottom">
      <button class="fc3-star${stat==='easy'?' fc3-starred':''}" id="fc3-star">${stat==='easy'?'⭐':'☆'}</button>
      <span class="fc3-ctr">${idx+1}&thinsp;/&thinsp;${total}</span>
      <button class="fc3-flip-btn" id="fc3-flip">↻ &nbsp;გადატრიალება</button>
    </div>
  `;

  /* ── BACK ──────────────────────────────────────────── */
  document.getElementById('fc3-back').innerHTML=`
    <div class="fc3-top">
      <div class="fc3-lv lv-${word.lv.toLowerCase()}">${word.lv}</div>
      <div class="fc3-chat-orb">💬</div>
      <button class="fc3-icon-btn" id="fc3-snd-g" title="ქართული წარმოთქვა">🔊</button>
    </div>

    <div class="fc3-back-hero">
      <div class="fc3-geo-large">${word.t}</div>
      <div class="fc3-word-ref">${LANG_FLAGS[lang]} &nbsp;${word.a?`<em>${word.a}</em> `:''}${word.w}</div>
    </div>

    ${word.ef?`
      <div class="fc3-ex-wrap">
        <div class="fc3-ex-label">EXAMPLE</div>
        <div class="fc3-ex-box">
          <div class="fc3-ef">${word.ef}</div>
          ${word.eg?`<div class="fc3-eg">${word.eg}</div>`:''}
          <button class="fc3-snd-sm" id="fc3-snd-ex">🔊</button>
        </div>
      </div>`:''}

    ${word.note?`
      <div class="fc3-ex-label" style="margin-top:10px">NOTE</div>
      <div class="fc3-note">💡 ${word.note}</div>`:''}
  `;

  /* reset flip */
  _fcFlipped=false;
  document.getElementById('fc3-card').classList.remove('flipped');
  document.getElementById('fc-rating').style.display='none';

  /* bind */
  _bindFC3(word, lang);

  /* animate */
  if (animate){
    const card=document.getElementById('fc3-card');
    const cls=dir==='left'?'fc3-from-left':'fc3-from-right';
    card.classList.add(cls);
    setTimeout(()=>card.classList.remove(cls),420);
  }
}

/* ─── Event binding ──────────────────────────────────── */
function _bindFC3(word, lang){
  document.getElementById('fc3-snd-f')?.addEventListener('click',e=>{e.stopPropagation();speakWord(word.w,lang);});
  document.getElementById('fc3-snd-g')?.addEventListener('click',e=>{e.stopPropagation();speakWord(word.t,'ka');});
  document.getElementById('fc3-snd-ex')?.addEventListener('click',e=>{e.stopPropagation();speakWord(word.ef,lang);});
  document.getElementById('fc3-flip')?.addEventListener('click',e=>{e.stopPropagation();_flipCard();});
  document.getElementById('fc3-star')?.addEventListener('click',e=>{
    e.stopPropagation();
    const s=getWordStatus(word.id);
    setWordStatus(word.id,s==='easy'?null:'easy');
    if(s!=='easy'){addXp(20,'star');toast('⭐ ნასწავლ სიტყვებში!');}
    _renderFC3();
  });
  /* tap front face body → flip */
  document.getElementById('fc3-front')?.addEventListener('click',_flipCard);
}

/* ─── Flip ───────────────────────────────────────────── */
function _flipCard(){
  if (_fcFlipped) return;
  _fcFlipped=true;
  document.getElementById('fc3-card').classList.add('flipped');
  document.getElementById('fc-rating').style.display='flex';
}

/* ─── Rate ───────────────────────────────────────────── */
function rateWord(rating){
  const word=S.fcQueue[S.fcIndex];
  if (!word) return;
  setWordStatus(word.id,rating);
  if (rating==='easy'){
    const prog=getProgress(),key=S.lang+'_'+word.id;
    if(!prog[key]){prog[key]={date:new Date().toISOString()};lsSet('progress',prog);}
    addXp(20,'easy');toast('✅ ნასწავლ სიტყვებში! +20 XP');
  } else if(rating==='medium'){addXp(5,'med');toast('🔄 გასამეობელში +5 XP');}
  else{addXp(2,'hard');toast('↩ გასამეობელში +2 XP');}
  S.fcIndex++;
  if (S.fcIndex>=S.fcQueue.length) _showSummary();
  else _renderFC3(true,'right');
}

/* ─── Summary ────────────────────────────────────────── */
function _showSummary(){
  const total=S.fcQueue.length;
  const easy=S.fcQueue.filter(w=>getWordStatus(w.id)==='easy').length;
  const med =S.fcQueue.filter(w=>getWordStatus(w.id)==='medium').length;
  const hard=S.fcQueue.filter(w=>getWordStatus(w.id)==='hard').length;
  const xp=easy*20+med*5+hard*2;
  document.getElementById('fc-prog').style.width='100%';
  document.getElementById('fc-rating').style.display='none';
  document.getElementById('fc3-card').classList.remove('flipped');
  document.getElementById('fc3-front').innerHTML=`
    <div class="fc3-summary">
      <div class="fc3-sum-emoji">${easy>=total*.7?'🏆':'💪'}</div>
      <div class="fc3-sum-title">${easy>=total*.7?'შესანიშნავია!':'კარგი სესია!'}</div>
      <div class="fc3-sum-row">
        <div class="fc3-sum-s c-easy"><div class="fc3-sum-n">${easy}</div><div class="fc3-sum-l">✅ ადვილი</div></div>
        <div class="fc3-sum-s c-med"> <div class="fc3-sum-n">${med}</div> <div class="fc3-sum-l">🔄 ისე რა</div></div>
        <div class="fc3-sum-s c-hard"><div class="fc3-sum-n">${hard}</div><div class="fc3-sum-l">↩ რთული</div></div>
      </div>
      <div class="fc3-sum-xp">+${xp} XP</div>
      <button class="fc3-sum-btn" id="fc3-done">დახურვა ✓</button>
    </div>`;
  document.getElementById('fc3-back').innerHTML='';
  document.getElementById('fc3-done').addEventListener('click',closeFCOverlay);
}

/* ─── Close ──────────────────────────────────────────── */
function closeFCOverlay(){
  document.getElementById('fc-overlay').classList.remove('active');
  document.getElementById('fc-rating').style.display='none';
  document.getElementById('fc3-card').classList.remove('flipped');
  document.getElementById('fc3-front').innerHTML='';
  document.getElementById('fc3-back').innerHTML='';
  _fcFlipped=false;
  if(S.page==='home')       renderHome();
  if(S.page==='learned')    renderLearned();
  if(S.page==='review')     renderReview();
  if(S.page==='statistics') renderStatistics();
}

/* ══════════════════════════════════════════════════════
   LEARNED + REVIEW pages (unchanged from before)
══════════════════════════════════════════════════════ */
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
