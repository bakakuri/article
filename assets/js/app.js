/* ══════════════════════════════════════════════════════════════
   LinguaFlow · app.js — Core Only
   State · Utils · Toast · Modal · Header · Navigation · Init
   Pages → assets/js/pages/
   Flashcard → assets/js/flashcard.js
══════════════════════════════════════════════════════════════ */

/* ─── STATE ──────────────────────────────────────────────── */
const S = {
  user: null, profile: null,
  page: 'home', lang: 'de',
  filter: 'all', search: '',
};

/* ─── LOCALSTORAGE ───────────────────────────────────────── */
function ls(key, def = null) {
  try { const v = localStorage.getItem('lf_' + key); return v !== null ? JSON.parse(v) : def; }
  catch { return def; }
}
function lsSet(key, val) { localStorage.setItem('lf_' + key, JSON.stringify(val)); }
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
  sb.from('profiles').update({ total_xp: S.profile.total_xp }).eq('id', S.profile.id).then(() => {});
}

/* ─── TOAST ──────────────────────────────────────────────── */
let _tt = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(_tt);
  _tt = setTimeout(() => el.classList.remove('visible'), 2400);
}

/* ─── MODAL ──────────────────────────────────────────────── */
function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal').classList.add('active');
}
function closeModal() { document.getElementById('modal').classList.remove('active'); }

function showGrammar() {
  const items = GRAMMAR[S.lang] || [];
  const lang  = LANGS[S.lang]  || LANGS.de;
  openModal(`${lang.flag} გრამატიკა`, items.map(g => `
    <div class="grammar-item">
      <div class="grammar-term">${g.term}</div>
      <div class="grammar-rule">${g.rule}</div>
      <div class="grammar-example">${g.ex}</div>
    </div>`).join(''));
}
function showLevelsModal() {
  openModal('📚 დონეები', LEVELS.map(lv =>
    `<div class="modal-item"><strong>${lv}</strong><span>${LEVEL_NAMES[lv]}</span></div>`
  ).join(''));
}

/* ─── HEADER ─────────────────────────────────────────────── */
function updateHeader() {
  const p    = S.profile;
  const lang = LANGS[S.lang] || LANGS.de;
  if (!p) return;
  document.getElementById('hdr-streak').textContent     = `🔥 ${p.streak || 0}`;
  document.getElementById('hdr-xp').textContent         = `⭐ ${p.total_xp || 0} XP`;
  document.getElementById('hdr-avatar').textContent     = p.avatar || '👤';
  document.getElementById('app-brand-name').textContent = `${lang.flag} LinguaFlow`;
}

/* ─── NAVIGATION ─────────────────────────────────────────── */
const PAGE_RENDERS = {
  home:       () => renderHome(),
  words:      () => renderWords(),
  statistics: () => renderStatistics(),
  challenges: () => renderChallenges(),
  more:       () => renderMore(),
};

function goTo(page) {
  S.page = page;
  document.querySelectorAll('.app-page').forEach(el => el.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.page === page));
  document.querySelector('.app-content').scrollTop = 0;
  if (PAGE_RENDERS[page]) { PAGE_RENDERS[page](); return; }
  if (page === 'learned' && typeof renderLearned === 'function') renderLearned();
  if (page === 'review'  && typeof renderReview  === 'function') renderReview();
}

/* ─── GLOBAL BINDINGS ────────────────────────────────────── */
function bindGlobal() {
  /* auth */
  document.getElementById('go-register').addEventListener('click', () => showAuthView('register'));
  document.getElementById('go-login').addEventListener('click',    () => showAuthView('login'));
  document.getElementById('btn-login').addEventListener('click',   doLogin);
  document.getElementById('btn-register').addEventListener('click',doRegister);
  ['login-email','login-password'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => e.key === 'Enter' && doLogin()));
  ['reg-username','reg-email','reg-password'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => e.key === 'Enter' && doRegister()));
  /* nav */
  document.querySelectorAll('.nav-item').forEach(b =>
    b.addEventListener('click', () => goTo(b.dataset.page)));
  /* modal */
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', e =>
    e.target === document.getElementById('modal') && closeModal());
  /* flashcard */
  document.getElementById('fc-close').addEventListener('click',  closeFCOverlay);
  document.getElementById('fc-hard').addEventListener('click',   () => rateWord('hard'));
  document.getElementById('fc-medium').addEventListener('click', () => rateWord('medium'));
  document.getElementById('fc-easy').addEventListener('click',   () => rateWord('easy'));
  /* admin */
  initAdmin();
  /* esc */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeFCOverlay(); }
  });
}

/* ─── INIT ───────────────────────────────────────────────── */
async function init() {
  await loadWords();
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) await afterAuth(session.user);
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user && !S.user) await afterAuth(session.user);
    if (event === 'SIGNED_OUT') { S.user = null; S.profile = null; }
  });
}
