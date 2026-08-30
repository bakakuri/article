/* ══════════════════════════════════════════════════════════════
   LinguaFlow · flashcard.js v5  —  All Features
   Swipe · Keyboard · Auto-speak · Tilt · Confetti · Quiz · Gender
══════════════════════════════════════════════════════════════ */

const LANG_FLAGS = { de:'🇩🇪', en:'🇬🇧', fr:'🇫🇷', es:'🇪🇸', ru:'🇷🇺' };
const TTS_LANGS  = { de:'de-DE', en:'en-US', fr:'fr-FR', es:'es-ES', ru:'ru-RU', ka:'ka-GE' };
const GENDER_CLR = { der:'#60a5fa', die:'#f87171', das:'#4ade80' };

let _fcFlipped = false;
let _fcMode    = 'cards'; // 'cards' | 'quiz'
let _touchSX   = 0, _touchSY = 0, _touchT = 0;
let _kbBound   = false;
let _autoSpeak = true;

/* ─── Word Status ─────────────────────────────────────────── */
function getWordStatus(wid) { return ls('wst_'+S.lang+'_'+wid); }
function setWordStatus(wid, status) {
  if (!status) localStorage.removeItem('lf_wst_'+S.lang+'_'+wid);
  else lsSet('wst_'+S.lang+'_'+wid, status);
  if (S.user && wid)
    sb.from('word_progress').upsert({
      user_id:S.user.id, word_id:wid,
      status:status||'none', reviewed_at:new Date().toISOString()
    },{onConflict:'user_id,word_id'}).then(()=>{});
}
function _wst(lang,wid){ try{return JSON.parse(localStorage.getItem('lf_wst_'+lang+'_'+wid));}catch{return null;} }
function getLearnedWords(lang){ return getVocab(lang).filter(w=>_wst(lang,w.id)==='easy'); }
function getReviewWords(lang) { return getVocab(lang).filter(w=>{ const s=_wst(lang,w.id); return s==='hard'||s==='medium'; }); }

/* ─── TTS ─────────────────────────────────────────────────── */
function speakWord(text, lang){
  if (!text || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = TTS_LANGS[lang]||'de-DE'; u.rate = 0.8;
  speechSynthesis.speak(u);
}

/* ─── Confetti ────────────────────────────────────────────── */
function _confetti(){
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style,{position:'fixed',inset:'0',zIndex:'700',pointerEvents:'none'});
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = innerWidth; canvas.height = innerHeight;
  const colors = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6'];
  const pts = Array.from({length:90},()=>({
    x:Math.random()*canvas.width, y:Math.random()*-canvas.height*.5,
    vx:(Math.random()-.5)*5, vy:Math.random()*4+2,
    r:Math.random()*360, rv:(Math.random()-.5)*10,
    w:Math.random()*10+4, h:Math.random()*5+3,
    c:colors[Math.floor(Math.random()*colors.length)],
  }));
  let af, done=0;
  (function frame(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.r+=p.rv; p.vy+=.06;
      if(p.y<canvas.height+20){
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r*Math.PI/180);
        ctx.fillStyle=p.c; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      } else done++;
    });
    if(done<pts.length){ done=0; af=requestAnimationFrame(frame); }
    else canvas.remove();
  })();
  setTimeout(()=>{ cancelAnimationFrame(af); canvas.remove(); }, 3500);
}

/* ─── Start cards ─────────────────────────────────────────── */
function startFlashcards(count=10, pool=null){
  const vocab     = pool || getVocab(S.lang);
  const unlearned = vocab.filter(w=>getWordStatus(w.id)!=='easy');
  const learned   = vocab.filter(w=>getWordStatus(w.id)==='easy');
  const queue     = pool ? [...vocab] : [...unlearned,...learned].slice(0,count);
  if (!queue.length){ toast('სიტყვები ვერ მოიძებნა'); return; }
  S.fcQueue=queue; S.fcIndex=0; _fcFlipped=false; _fcMode='cards';
  document.getElementById('fc-overlay').classList.add('active');
  _bindNavBtns(); _bindSwipe(); _bindKeyboard();
  _renderFC(true);
}

/* ─── Start quiz ──────────────────────────────────────────── */
function startQuizMode(count=10){
  const vocab = getVocab(S.lang);
  if (vocab.length < 4){ toast('Quiz-ისთვის მინ. 4 სიტყვა'); return; }
  const queue = [...vocab].sort(()=>Math.random()-.5).slice(0,count);
  S.fcQueue=queue; S.fcIndex=0; _fcFlipped=false; _fcMode='quiz';
  document.getElementById('fc-overlay').classList.add('active');
  _bindNavBtns(); _bindSwipe(); _bindKeyboard();
  _renderQuiz();
}

/* ─── Nav buttons ─────────────────────────────────────────── */
function _bindNavBtns(){
  ['fc3-prev','fc3-next'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cl=el.cloneNode(true); el.parentNode.replaceChild(cl,el);
  });
  document.getElementById('fc3-prev').addEventListener('click',()=>{
    if(S.fcIndex>0){ S.fcIndex--; _go('left'); }
  });
  document.getElementById('fc3-next').addEventListener('click',()=>{
    if(S.fcIndex<S.fcQueue.length-1){ S.fcIndex++; _go('right'); }
  });
}
function _go(dir){ _fcMode==='quiz' ? _renderQuiz(dir) : _renderFC(true,dir); }

/* ─── Swipe gesture ───────────────────────────────────────── */
function _bindSwipe(){
  const ov = document.getElementById('fc-overlay');
  ov.ontouchstart = e=>{ _touchSX=e.touches[0].clientX; _touchSY=e.touches[0].clientY; _touchT=Date.now(); };
  ov.ontouchend   = e=>{
    if(Date.now()-_touchT>400) return;
    const dx=e.changedTouches[0].clientX-_touchSX;
    const dy=e.changedTouches[0].clientY-_touchSY;
    if(Math.abs(dy)>Math.abs(dx)&&dy<-55){ _flipCard(); return; }
    if(Math.abs(dx)>55){
      if(dx>0&&S.fcIndex>0){ S.fcIndex--; _go('left'); }
      else if(dx<0&&S.fcIndex<S.fcQueue.length-1){ S.fcIndex++; _go('right'); }
    }
  };
}

/* ─── Keyboard shortcuts ──────────────────────────────────── */
function _bindKeyboard(){
  if(_kbBound) return; _kbBound=true;
  document.addEventListener('keydown',e=>{
    if(!document.getElementById('fc-overlay').classList.contains('active')) return;
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
    switch(e.key){
      case 'ArrowLeft':  if(S.fcIndex>0){S.fcIndex--;_go('left');} break;
      case 'ArrowRight': if(S.fcIndex<S.fcQueue.length-1){S.fcIndex++;_go('right');} break;
      case ' ':          e.preventDefault(); _flipCard(); break;
      case '1':          if(_fcFlipped) rateWord('hard');   break;
      case '2':          if(_fcFlipped) rateWord('medium'); break;
      case '3':          if(_fcFlipped) rateWord('easy');   break;
      case 'Escape':     closeFCOverlay(); break;
    }
  });
}

/* ─── Tilt (desktop) ──────────────────────────────────────── */
function _bindTilt(){
  const scene=document.querySelector('.fc3-scene');
  if(!scene||window.matchMedia('(hover:none)').matches) return;
  scene.addEventListener('mousemove',e=>{
    if(_fcFlipped||_fcMode==='quiz') return;
    const r=scene.getBoundingClientRect();
    const x=((e.clientX-r.left)/r.width-.5)*14;
    const y=-((e.clientY-r.top)/r.height-.5)*9;
    const card=document.getElementById('fc3-card');
    if(card) card.style.transform=`rotateY(${x}deg) rotateX(${y}deg)`;
  });
  scene.addEventListener('mouseleave',()=>{
    const card=document.getElementById('fc3-card');
    if(card&&!_fcFlipped) card.style.transform='';
  });
}

/* ══════════════════════════════════════════════════════════
   CARDS MODE — RENDER
══════════════════════════════════════════════════════════ */
function _renderFC(animate=false, dir='right'){
  const word=S.fcQueue[S.fcIndex], idx=S.fcIndex, total=S.fcQueue.length;
  const lang=S.lang, stat=getWordStatus(word.id);
  const gender = word.a || '';
  const gClr   = GENDER_CLR[gender] || null;

  document.getElementById('fc-prog').style.width=Math.round((idx/total)*100)+'%';
  document.getElementById('fc-counter').textContent=`${idx+1} / ${total}`;
  const pb=document.getElementById('fc3-prev'); if(pb) pb.disabled=idx===0;
  const nb=document.getElementById('fc3-next'); if(nb) nb.disabled=idx===total-1;

  const sparks=[0,1,2,3,4,5].map(i=>`<span class="fc-spark" style="left:${8+i*15}%;top:${10+i*12}%;animation-delay:${i*.3}s;font-size:${8+i%3*3}px">✦</span>`).join('');

  /* ── FRONT ── */
  const front=document.getElementById('fc3-front');
  front.setAttribute('data-gender', gender);
  if(gClr){ front.style.borderColor=gClr+'99'; front.style.boxShadow=`0 0 60px ${gClr}22,0 20px 60px ${gClr}18,inset 0 1px 0 rgba(255,255,255,.1)`; }
  else { front.style.borderColor=''; front.style.boxShadow=''; }

  front.innerHTML=`
    <div class="fc-sparks" aria-hidden="true">${sparks}</div>
    <div class="fc-top">
      <span class="fc-lv lv-${word.lv.toLowerCase()}">${word.lv}</span>
      <div class="fc-flag-orb" ${gClr?`style="border-color:${gClr}88;animation:none;box-shadow:0 0 28px ${gClr}66"`:''}><span class="fc-flag-inner">${LANG_FLAGS[lang]||'🌐'}</span></div>
      <button class="fc-snd-btn" id="fc-snd-word">🔊</button>
    </div>
    <div class="fc-word-zone">
      ${word.a?`<div class="fc-article" style="${gClr?`color:${gClr}`:''}">${word.a}</div>`:''}
      <div class="fc-word">${word.w}</div>
      ${word.ph?`<div class="fc-phonetic">${word.ph}</div>`:''}
      ${word.cat?`<div class="fc-tag-wrap"><span class="fc-tag">🏷 ${word.cat}</span></div>`:''}
    </div>
    <div class="fc-shine-divider" ${gClr?`style="background:linear-gradient(90deg,transparent,${gClr}99,transparent)"`:''}></div>
    <div class="fc-geo-row">
      <span class="fc-geo-flag">🇬🇪</span>
      <span class="fc-geo-word">${word.t}</span>
    </div>
    <div class="fc-bottom">
      <button class="fc-star-btn${stat==='easy'?' starred':''}" id="fc-star">${stat==='easy'?'⭐':'☆'}</button>
      <div class="fc-hint-row">
        <span class="fc-kbd-hint">← →&thinsp;ნავ &nbsp; ␣&thinsp;flip &nbsp; 1·2·3&thinsp;rate</span>
      </div>
      <button class="fc-flip-btn" id="fc-flip">↻ გადატრიალება</button>
    </div>`;

  /* ── BACK ── */
  /* ── BACK ── */
  const altHtml = word.alt?.length ? `
    <div class="fc-alt-row">${word.alt.map(a=>`<span class="fc-alt-chip">${a}</span>`).join('')}</div>` : '';

  const conjHtml = (word.verb && word.type==='verb' && word.verb.present) ? `
    <div class="fc-ex-label">✦ სპრიაება ✦</div>
    <div class="fc-conj-grid">
      ${[['ich','du','er/sie/es'],['wir','ihr','sie/Sie']].map(row=>
        `<div class="fc-conj-row">${row.map(p=>{
          const k=p.replace(/\//g,'_').replace(/\s/g,'');
          const keys={'ich':'ich','du':'du','er/sie/es':'er_sie_es','wir':'wir','ihr':'ihr','sie/Sie':'sie_Sie'};
          const f=word.verb.present[keys[p]]||'—';
          return `<div class="fc-conj-cell"><span class="fc-cp">${p}</span><span class="fc-cf">${f}</span></div>`;
        }).join('')}</div>`
      ).join('')}
    </div>
    ${word.verb.perfect?`<div class="fc-perfect">Perfekt: <strong>${word.verb.perfect.auxiliary||''} ${word.verb.perfect.participle||''}</strong></div>`:''}` : '';

  const gramHtml = word.grammar?.length ? `
    <div class="fc-ex-label">✦ გრამატიკა ✦</div>
    ${word.grammar.slice(0,2).map(g=>`
      <div class="fc-gram-box">
        <div class="fc-gram-topic">${g.topic}</div>
        <div class="fc-gram-exp">${g.explanation}</div>
        ${g.example?`<div class="fc-gram-ex">${g.example}</div>`:''}
      </div>`).join('')}` : '';

  document.getElementById('fc3-back').innerHTML=`
    <div class="fc-top">
      <span class="fc-lv lv-${word.lv.toLowerCase()}">${word.lv}</span>
      <div class="fc-chat-orb">💬</div>
      <button class="fc-snd-btn" id="fc-snd-geo">🔊</button>
    </div>
    <div class="fc-back-hero">
      <div class="fc-geo-large">${word.t}</div>
      ${altHtml}
      <div class="fc-orig-word">${LANG_FLAGS[lang]}&nbsp;${word.a?`<em class="fc-orig-art" style="${gClr?`color:${gClr}`:''}">${word.a}</em> `:''}${word.w}</div>
      ${word.ph?`<div class="fc-orig-ph">${word.ph}</div>`:''}
    </div>
    ${conjHtml}
    ${word.ef?`
    <div class="fc-ex-wrap">
      <div class="fc-ex-label">✦ EXAMPLE ✦</div>
      <div class="fc-ex-box">
        <button class="fc-ex-snd" id="fc-snd-ex">🔊</button>
        <div class="fc-ef">${word.ef}</div>
        ${word.ep?`<div class="fc-ep">${word.ep}</div>`:''}
        ${word.eg?`<div class="fc-eg">${word.eg}</div>`:''}
      </div>
    </div>`:''}
    ${gramHtml}
    ${word.note?`<div class="fc-note">💡 ${word.note}</div>`:''}
  `;
  /* reset */
  _fcFlipped=false;
  const card=document.getElementById('fc3-card');
  card.style.transform=''; card.classList.remove('flipped');
  document.getElementById('fc-rating').style.display='none';
  _bindFC(word,lang); _bindTilt();

  if(animate){
    const cls=dir==='left'?'fc-from-left':'fc-from-right';
    card.classList.add(cls); setTimeout(()=>card.classList.remove(cls),430);
  }
  if(_autoSpeak) setTimeout(()=>speakWord(word.w,lang),380);
}

function _bindFC(word,lang){
  document.getElementById('fc-snd-word')?.addEventListener('click',e=>{e.stopPropagation();speakWord(word.w,lang);});
  document.getElementById('fc-snd-geo')?.addEventListener('click', e=>{e.stopPropagation();speakWord(word.t,'ka');});
  document.getElementById('fc-snd-ex')?.addEventListener('click',  e=>{e.stopPropagation();speakWord(word.ef,lang);});
  document.getElementById('fc-flip')?.addEventListener('click',    e=>{e.stopPropagation();_flipCard();});
  document.getElementById('fc-star')?.addEventListener('click',    e=>{
    e.stopPropagation();
    const s=getWordStatus(word.id);
    setWordStatus(word.id,s==='easy'?null:'easy');
    if(s!=='easy'){addXp(20,'star');toast('⭐ ნასწავლ სიტყვებში!');}
    _renderFC();
  });
  document.getElementById('fc3-front')?.addEventListener('click',_flipCard);
}

function _flipCard(){
  if(_fcFlipped) return; _fcFlipped=true;
  const card=document.getElementById('fc3-card');
  card.style.transform=''; card.classList.add('flipped');
  document.getElementById('fc-rating').style.display='flex';
  if(_autoSpeak) setTimeout(()=>speakWord(S.fcQueue[S.fcIndex]?.t,'ka'),320);
}

/* ─── Rate ───────────────────────────────────────────────── */
function rateWord(rating){
  const word=S.fcQueue[S.fcIndex]; if(!word) return;
  setWordStatus(word.id,rating);
  if(rating==='easy'){
    const prog=getProgress(),key=S.lang+'_'+word.id;
    if(!prog[key]){prog[key]={date:new Date().toISOString()};lsSet('progress',prog);}
    addXp(20,'easy'); toast('✅ ნასწავლ სიტყვებში! +20 XP'); _confetti();
  } else if(rating==='medium'){addXp(5,'med'); toast('🔄 გასამეობელში +5 XP');}
  else{addXp(2,'hard'); toast('↩ გასამეობელში +2 XP');}
  S.fcIndex++;
  if(S.fcIndex>=S.fcQueue.length) _showSummary();
  else _renderFC(true,'right');
}

/* ══════════════════════════════════════════════════════════
   QUIZ MODE
══════════════════════════════════════════════════════════ */
function _renderQuiz(dir='right'){
  const word=S.fcQueue[S.fcIndex], idx=S.fcIndex, total=S.fcQueue.length;
  const vocab=getVocab(S.lang);

  document.getElementById('fc-prog').style.width=Math.round((idx/total)*100)+'%';
  document.getElementById('fc-counter').textContent=`${idx+1} / ${total}`;
  const pb=document.getElementById('fc3-prev'); if(pb) pb.disabled=true; // no nav in quiz
  const nb=document.getElementById('fc3-next'); if(nb) nb.disabled=true;

  /* 4 choices */
  const wrong=vocab.filter(w=>w.id!==word.id).sort(()=>Math.random()-.5).slice(0,3);
  const choices=[...wrong,word].sort(()=>Math.random()-.5);

  document.getElementById('fc3-front').innerHTML=`
    <div class="fc-top">
      <span class="fc-lv lv-${word.lv.toLowerCase()}">${word.lv}</span>
      <div class="fc-flag-orb"><span class="fc-flag-inner">${LANG_FLAGS[S.lang]||'🌐'}</span></div>
      <button class="fc-snd-btn" id="fc-snd-word">🔊</button>
    </div>
    <div class="fc-quiz-q">
      ${word.a?`<div class="fc-article ${word.a}">${word.a}</div>`:''}
      <div class="fc-word">${word.w}</div>
      ${word.ph?`<div class="fc-phonetic">${word.ph}</div>`:''}
      <div class="fc-quiz-sub">ქართული თარგმანი?</div>
    </div>
    <div class="fc-choices" id="fc-choices">
      ${choices.map(c=>`<button class="fc-choice" data-id="${c.id}" data-correct="${c.id===word.id}">${c.t}</button>`).join('')}
    </div>`;
  document.getElementById('fc3-back').innerHTML='';
  const card=document.getElementById('fc3-card');
  card.style.transform=''; card.classList.remove('flipped');
  document.getElementById('fc-rating').style.display='none';

  document.getElementById('fc-snd-word')?.addEventListener('click',e=>{e.stopPropagation();speakWord(word.w,S.lang);});
  document.getElementById('fc-choices').addEventListener('click',e=>{
    const btn=e.target.closest('.fc-choice'); if(!btn||btn.disabled) return;
    const correct=btn.dataset.correct==='true';
    document.querySelectorAll('.fc-choice').forEach(b=>{
      b.disabled=true;
      if(b.dataset.correct==='true') b.classList.add('fc-choice-ok');
      else if(b===btn&&!correct) b.classList.add('fc-choice-no');
    });
    if(correct){
      setWordStatus(word.id,'easy'); addXp(15,'quiz'); toast('✅ სწორია! +15 XP'); _confetti();
    } else {
      setWordStatus(word.id,'hard'); addXp(2,'quiz'); toast(`❌ სწორი: ${word.t}`);
    }
    if(_autoSpeak) speakWord(word.w,S.lang);
    setTimeout(()=>{ S.fcIndex++; S.fcIndex>=S.fcQueue.length?_showSummary():_renderQuiz(); },1300);
  });
  if(_autoSpeak) setTimeout(()=>speakWord(word.w,S.lang),350);

  if(dir){ const cls=dir==='left'?'fc-from-left':'fc-from-right'; card.classList.add(cls); setTimeout(()=>card.classList.remove(cls),430); }
}

/* ─── Summary ────────────────────────────────────────────── */
function _showSummary(){
  const total=S.fcQueue.length;
  const easy=S.fcQueue.filter(w=>getWordStatus(w.id)==='easy').length;
  const med =S.fcQueue.filter(w=>getWordStatus(w.id)==='medium').length;
  const hard=S.fcQueue.filter(w=>getWordStatus(w.id)==='hard').length;
  const xp=easy*(S.fcMode==='quiz'?15:20)+med*5+hard*2;
  document.getElementById('fc-prog').style.width='100%';
  document.getElementById('fc-rating').style.display='none';
  document.getElementById('fc3-card').classList.remove('flipped');
  document.getElementById('fc3-front').innerHTML=`
    <div class="fc-summary">
      <div class="fc-sum-trophy">${easy>=total*.7?'🏆':'💪'}</div>
      <div class="fc-sum-title">${easy>=total*.7?'შესანიშნავია!':'კარგი სესია!'}</div>
      <div class="fc-sum-mode">${S.fcMode==='quiz'?'🧩 Quiz Mode':'🃏 Flashcards'}</div>
      <div class="fc-sum-row">
        <div class="fc-sum-s c-easy"><div class="fc-sum-n">${easy}</div><div class="fc-sum-l">✅ ადვილი</div></div>
        <div class="fc-sum-s c-med"><div class="fc-sum-n">${med}</div><div class="fc-sum-l">🔄 ისე რა</div></div>
        <div class="fc-sum-s c-hard"><div class="fc-sum-n">${hard}</div><div class="fc-sum-l">↩ რთული</div></div>
      </div>
      <div class="fc-sum-xp">+${xp} XP</div>
      <div class="fc-sum-btns">
        <button class="fc-sum-btn-sec" id="fc-again">↺ კიდე ერთხელ</button>
        <button class="fc-sum-btn" id="fc-done">დახურვა ✓</button>
      </div>
    </div>`;
  document.getElementById('fc3-back').innerHTML='';
  document.getElementById('fc-done').addEventListener('click',closeFCOverlay);
  document.getElementById('fc-again').addEventListener('click',()=>{
    S.fcIndex=0; _fcFlipped=false;
    S.fcMode==='quiz'?_renderQuiz():_renderFC(true);
  });
  _confetti();
}

function closeFCOverlay(){
  document.getElementById('fc-overlay').classList.remove('active');
  document.getElementById('fc-rating').style.display='none';
  const card=document.getElementById('fc3-card');
  card.style.transform=''; card.classList.remove('flipped');
  document.getElementById('fc3-front').innerHTML='';
  document.getElementById('fc3-back').innerHTML='';
  _fcFlipped=false;
  if(S.page==='home')       renderHome();
  if(S.page==='learned')    renderLearned();
  if(S.page==='review')     renderReview();
  if(S.page==='statistics') renderStatistics();
}

/* ══════════════════════════════════════════════════════════
   LEARNED + REVIEW (unchanged)
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
    ${learned.length?`<div class="lrn-actions"><button class="adm-btn adm-btn-primary" id="lrn-go">▶ სესიის დაწყება (${learned.length})</button><button class="adm-btn" id="lrn-quiz" style="background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.4);color:#c084fc">🧩 Quiz (${learned.length})</button></div>`:''}
    <div class="word-grid">${cards}</div>`;
  document.getElementById('lrn-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b){S.lang=b.dataset.lang;updateHeader();renderLearned();}});
  document.getElementById('lrn-go')?.addEventListener('click',()=>startFlashcards(learned.length,learned));
  document.getElementById('lrn-quiz')?.addEventListener('click',()=>startQuizMode(learned.length));
  document.getElementById('page-learned').addEventListener('click',e=>{const b=e.target.closest('.lrn-unlearn');if(b){setWordStatus(b.dataset.id,'medium');toast('🔄 გასამეობელში');renderLearned();}});
}

function renderReview(){
  const lang=LANGS[S.lang]||LANGS.de, review=getReviewWords(S.lang);
  const hard=review.filter(w=>_wst(S.lang,w.id)==='hard');
  const medium=review.filter(w=>_wst(S.lang,w.id)==='medium');
  const tabs=Object.entries(LANGS).map(([c,l])=>`<button class="level-tab${S.lang===c?' active':''}" data-lang="${c}">${l.flag} ${l.name}</button>`).join('');
  const mkCards=(ws,cls)=>ws.map(w=>`<div class="word-card rev-card ${cls}">${w.a?`<div class="word-card-article">${w.a}</div>`:''}<div class="word-card-word">${w.w}</div><div class="word-card-translation">${w.t}</div><div class="word-card-level">${w.lv}</div></div>`).join('');
  document.getElementById('page-review').innerHTML=`
    <div class="page-header"><h1>🔄 გასამეობელი</h1><p>${lang.flag} ${lang.name} · ${review.length} სიტყვა</p></div>
    <div class="level-tabs" id="rev-tabs">${tabs}</div>
    ${review.length?`
    <div class="rev-stats"><div class="rev-stat rev-hard"><div class="rev-stat-val">${hard.length}</div><div class="rev-stat-lbl">↩ ძ. რთული</div></div><div class="rev-stat rev-medium"><div class="rev-stat-val">${medium.length}</div><div class="rev-stat-lbl">🔄 ისე რა</div></div></div>
    <div class="rev-actions">
      <button class="adm-btn adm-btn-primary" id="rev-all">▶ ყველა (${review.length})</button>
      ${hard.length?`<button class="adm-btn rev-btn-hard" id="rev-hard">↩ მხოლოდ რთული (${hard.length})</button>`:''}
      <button class="adm-btn" id="rev-quiz" style="background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.4);color:#c084fc">🧩 Quiz</button>
    </div>
    ${hard.length?`<div class="rev-group-label">↩ ძ. რთული</div><div class="word-grid">${mkCards(hard,'card-hard')}</div>`:''}
    ${medium.length?`<div class="rev-group-label" style="margin-top:20px">🔄 ისე რა</div><div class="word-grid">${mkCards(medium,'card-medium')}</div>`:''}
    `:`<div class="lrn-empty"><div style="font-size:48px;margin-bottom:16px">🎉</div><div style="font-size:18px;font-weight:700">გასამეობელი სიტყვა არ არის!</div></div>`}`;
  document.getElementById('rev-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b){S.lang=b.dataset.lang;updateHeader();renderReview();}});
  document.getElementById('rev-all')?.addEventListener('click',()=>startFlashcards(review.length,review));
  document.getElementById('rev-hard')?.addEventListener('click',()=>startFlashcards(hard.length,hard));
  document.getElementById('rev-quiz')?.addEventListener('click',()=>startQuizMode(Math.min(review.length,20)));
}
