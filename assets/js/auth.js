/* ══════════════════════════════════════════════════════════════
   LinguaFlow · auth.js
   Supabase Authentication — Login, Register, Logout, Session
══════════════════════════════════════════════════════════════ */


/* ─── AUTH VIEW SWITCHER ────────────────────────────────────── */
function showAuthView(name) {
  document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
}


/* ─── ERROR TRANSLATION (Georgian) ─────────────────────────── */
function translateAuthError(msg) {
  if (msg.includes('Invalid login credentials'))  return 'ელ-ფოსტა ან პაროლი არასწორია';
  if (msg.includes('Email not confirmed'))         return 'გთხოვ, ელ-ფოსტა დაადასტური';
  if (msg.includes('already registered'))          return 'ეს ელ-ფოსტა უკვე გამოყენებულია';
  if (msg.includes('Password should be'))          return 'პაროლი მინ. 6 სიმბოლო უნდა იყოს';
  if (msg.includes('Unable to validate'))          return 'ელ-ფოსტის ფორმატი არასწორია';
  if (msg.includes('User already registered'))     return 'მომხმარებელი უკვე არსებობს';
  if (msg.includes('rate limit'))                  return 'ბევრი მცდელობა — ცოტა ხანი დაიცადე';
  return msg;
}


/* ─── LOGIN ─────────────────────────────────────────────────── */
async function doLogin() {
  const email  = document.getElementById('login-email').value.trim();
  const pass   = document.getElementById('login-password').value;
  const errEl  = document.getElementById('login-error');
  const btn    = document.getElementById('btn-login');

  errEl.textContent = '';
  if (!email) { errEl.textContent = 'შეიყვანე ელ-ფოსტა'; return; }
  if (!pass)  { errEl.textContent = 'შეიყვანე პაროლი';   return; }

  btn.disabled    = true;
  btn.textContent = 'შესვლა…';

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });

  btn.disabled    = false;
  btn.textContent = 'შესვლა →';

  if (error) { errEl.textContent = translateAuthError(error.message); return; }
  await afterAuth(data.user);
}


/* ─── REGISTER ──────────────────────────────────────────────── */
async function doRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const pass     = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('reg-error');
  const btn      = document.getElementById('btn-register');

  errEl.textContent = '';
  if (!username || username.length < 2) { errEl.textContent = 'სახელი ძალიან მოკლეა (მინ. 2 სიმბოლო)'; return; }
  if (!email)                            { errEl.textContent = 'შეიყვანე ელ-ფოსტა';                       return; }
  if (pass.length < 6)                   { errEl.textContent = 'პაროლი მინ. 6 სიმბოლო';                  return; }

  btn.disabled    = true;
  btn.textContent = 'რეგისტრაცია…';

  const { data, error } = await sb.auth.signUp({
    email,
    password: pass,
    options: { data: { username } },
  });

  btn.disabled    = false;
  btn.textContent = 'დარეგისტრირება →';

  if (error) { errEl.textContent = translateAuthError(error.message); return; }

  if (data.user && !data.session) {
    /* email confirmation required */
    errEl.style.color   = '#25d5d1';
    errEl.textContent   = '✉️ დაადასტურე ელ-ფოსტა და შედი';
    return;
  }

  if (data.user) await afterAuth(data.user);
}


/* ─── LOGOUT ────────────────────────────────────────────────── */
async function doLogout() {
  await sb.auth.signOut();
  S.user    = null;
  S.profile = null;
  document.getElementById('app-layer').style.display  = 'none';
  document.getElementById('auth-layer').style.display = '';
  showAuthView('login');
  toast('👋 გამოხვედი სისტემიდან');
}


/* ─── AFTER SUCCESSFUL AUTH ─────────────────────────────────── */
async function afterAuth(user) {
  S.user = user;
  await loadProfile(user);
  document.getElementById('auth-layer').style.display = 'none';
  document.getElementById('app-layer').style.display  = '';
  updateHeader();
  goTo('home');
  checkStreak();
}


/* ─── LOAD PROFILE FROM SUPABASE ────────────────────────────── */
async function loadProfile(user) {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (data && !error) {
    S.profile = data;
    S.lang    = data.selected_language || 'de';
  } else {
    /* profile not yet created — create it now */
    const username = user.user_metadata?.username
      || user.email?.split('@')[0]
      || 'სტუმარი';

    S.profile = {
      id                : user.id,
      username,
      selected_language : 'de',
      current_level     : 'A1',
      total_xp          : 0,
      streak            : 0,
    };
    S.lang = 'de';

    await sb.from('profiles').upsert(S.profile);
  }
}


/* ─── STREAK CHECK ──────────────────────────────────────────── */
function checkStreak() {
  const p = S.profile;
  if (!p) return;

  const today = new Date().toDateString();
  const last  = ls('last_active');
  const yest  = new Date(Date.now() - 86400000).toDateString();

  if (last === today) return;           /* already checked today */

  if (last === yest) {
    p.streak = (p.streak || 0) + 1;    /* consecutive day       */
  } else {
    p.streak = 1;                       /* streak reset          */
  }

  lsSet('last_active', today);

  sb.from('profiles')
    .update({ streak: p.streak, last_activity_date: new Date().toISOString() })
    .eq('id', p.id)
    .then(() => {});

  updateHeader();
}
