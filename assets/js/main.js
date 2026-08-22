/* ══════════════════════════════════════════════════════════════
   LinguaFlow · main.js
   Entry point — ბოლო იტვირთება, ყველა სხვა ფაილის შემდეგ

   Load order (index.html):
     1. supabase CDN
     2. config.js  → sb
     3. data.js    → LANGS, VOCAB, GRAMMAR…
     4. app.js     → S, renders, navigation, flashcards
     5. auth.js    → doLogin, doRegister, afterAuth…
     6. main.js    → starts the app ← YOU ARE HERE
══════════════════════════════════════════════════════════════ */

bindGlobal();
initAdmin();
init();
