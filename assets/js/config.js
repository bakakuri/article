/* ══════════════════════════════════════════════════════════════
   LinguaFlow · config.js
   Supabase კლიენტის ინიციალიზაცია
   ──────────────────────────────────────────────────────────────
   შეცვალე შენი Supabase პროექტის მიხედვით:
   Project Settings → API → Project URL & anon public key
══════════════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_PUBLIC_KEY';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
