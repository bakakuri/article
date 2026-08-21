/* ══════════════════════════════════════════════════════════════
   LinguaFlow · config.js
   Supabase კლიენტის ინიციალიზაცია
   ──────────────────────────────────────────────────────────────
   შეცვალე შენი Supabase პროექტის მიხედვით:
   Project Settings → API → Project URL & anon public key
══════════════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://cdtibyfsoqtzodspeabq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdGlieWZzb3F0em9kc3BlYWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjg5OTUsImV4cCI6MjEwMjgwNDk5NX0.lagOZBHY7__ZK9XmrYxqeypZSMqhtaxeEZsGyKHuz38';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

