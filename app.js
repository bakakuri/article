/* ══════════════════════════════════════════════════════════════════
   LinguaFlow · app.js
   Vanilla JS + Supabase · Georgian-native multilingual learning
   ──────────────────────────────────────────────────────────────────
   SUPABASE SETUP SQL (run in Supabase SQL Editor):

   create table public.profiles (
     id uuid references auth.users on delete cascade primary key,
     username text not null,
     selected_language text default 'de',
     current_level text default 'A1',
     total_xp integer default 0,
     streak integer default 0,
     last_activity_date date,
     created_at timestamptz default now()
   );
   alter table public.profiles enable row level security;
   create policy "own profile" on public.profiles for all using (auth.uid() = id);

   create or replace function public.handle_new_user()
   returns trigger as $$
   begin
     insert into public.profiles (id, username)
     values (new.id, coalesce(new.raw_user_meta_data->>'username', 'სტუმარი'));
     return new;
   end;
   $$ language plpgsql security definer;
   create trigger on_auth_user_created
     after insert on auth.users
     for each row execute function public.handle_new_user();
══════════════════════════════════════════════════════════════════ */


/* ──────────────────────────────────────────────────────────────
   CONFIG  ← შეცვალე შენი Supabase პროექტის მიხედვით
──────────────────────────────────────────────────────────────── */
const SUPABASE_URL = 'https://cdtibyfsoqtzodspeabq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdGlieWZzb3F0em9kc3BlYWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjg5OTUsImV4cCI6MjEwMjgwNDk5NX0.lagOZBHY7__ZK9XmrYxqeypZSMqhtaxeEZsGyKHuz38';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


/* ──────────────────────────────────────────────────────────────
   STATE
──────────────────────────────────────────────────────────────── */
const S = {
  user    : null,
  profile : null,
  page    : 'home',
  lang    : 'de',
  filter  : 'all',
  search  : '',
  fcQueue : [],
  fcIndex : 0,
  fcFlipped: false,
  fcKnew  : 0,
};


/* ──────────────────────────────────────────────────────────────
   LANGUAGES
──────────────────────────────────────────────────────────────── */
const LANGS = {
  de : { name:'გერმანული', flag:'🇩🇪', label:'Deutsch'  },
  en : { name:'ინგლისური', flag:'🇬🇧', label:'English'  },
  fr : { name:'ფრანგული',  flag:'🇫🇷', label:'Français' },
  es : { name:'ესპანური',  flag:'🇪🇸', label:'Español'  },
  ru : { name:'რუსული',    flag:'🇷🇺', label:'Русский'  },
};
const LEVELS = ['A1','A2','B1','B2','C1'];
const LEVEL_NAMES = { A1:'დამწყები', A2:'საბაზისო', B1:'საშუალო', B2:'ზედა-საშუალო', C1:'გაფართოებული' };


/* ──────────────────────────────────────────────────────────────
   VOCABULARY
──────────────────────────────────────────────────────────────── */
const VOCAB = {
  de:[
    {id:'de01',w:'Haus',     a:'das',t:'სახლი',      lv:'A1'},
    {id:'de02',w:'Hund',     a:'der',t:'ძაღლი',      lv:'A1'},
    {id:'de03',w:'Katze',    a:'die',t:'კატა',        lv:'A1'},
    {id:'de04',w:'Schule',   a:'die',t:'სკოლა',      lv:'A1'},
    {id:'de05',w:'Tisch',    a:'der',t:'მაგიდა',     lv:'A1'},
    {id:'de06',w:'Buch',     a:'das',t:'წიგნი',      lv:'A1'},
    {id:'de07',w:'Stadt',    a:'die',t:'ქალაქი',     lv:'A1'},
    {id:'de08',w:'Mann',     a:'der',t:'კაცი',        lv:'A1'},
    {id:'de09',w:'Frau',     a:'die',t:'ქალი',        lv:'A1'},
    {id:'de10',w:'Kind',     a:'das',t:'ბავშვი',     lv:'A1'},
    {id:'de11',w:'Wasser',   a:'das',t:'წყალი',      lv:'A1'},
    {id:'de12',w:'Brot',     a:'das',t:'პური',        lv:'A1'},
    {id:'de13',w:'Auto',     a:'das',t:'მანქანა',    lv:'A1'},
    {id:'de14',w:'Baum',     a:'der',t:'ხე',          lv:'A1'},
    {id:'de15',w:'Blume',    a:'die',t:'ყვავილი',    lv:'A1'},
    {id:'de16',w:'essen',    a:null, t:'ჭამა',        lv:'A1'},
    {id:'de17',w:'trinken',  a:null, t:'სმა',         lv:'A1'},
    {id:'de18',w:'gehen',    a:null, t:'წასვლა',     lv:'A1'},
    {id:'de19',w:'kommen',   a:null, t:'მოსვლა',     lv:'A1'},
    {id:'de20',w:'lernen',   a:null, t:'სწავლა',     lv:'A1'},
    {id:'de21',w:'arbeiten', a:null, t:'მუშაობა',    lv:'A2'},
    {id:'de22',w:'schreiben',a:null, t:'წერა',        lv:'A2'},
    {id:'de23',w:'lesen',    a:null, t:'კითხვა',     lv:'A2'},
    {id:'de24',w:'sprechen', a:null, t:'საუბარი',    lv:'A2'},
    {id:'de25',w:'verstehen',a:null, t:'გაგება',     lv:'A2'},
    {id:'de26',w:'Fenster',  a:'das',t:'ფანჯარა',    lv:'A2'},
    {id:'de27',w:'Tür',      a:'die',t:'კარი',        lv:'A2'},
    {id:'de28',w:'Küche',    a:'die',t:'სამზარეულო', lv:'A2'},
    {id:'de29',w:'Straße',   a:'die',t:'ქუჩა',        lv:'A2'},
    {id:'de30',w:'Freund',   a:'der',t:'მეგობარი',   lv:'A2'},
    {id:'de31',w:'Morgen',   a:'der',t:'დილა',        lv:'B1'},
    {id:'de32',w:'Abend',    a:'der',t:'საღამო',     lv:'B1'},
    {id:'de33',w:'Nacht',    a:'die',t:'ღამე',        lv:'B1'},
    {id:'de34',w:'Woche',    a:'die',t:'კვირა',      lv:'B1'},
    {id:'de35',w:'Monat',    a:'der',t:'თვე',         lv:'B1'},
  ],
  en:[
    {id:'en01',w:'house',     a:null,t:'სახლი',      lv:'A1'},
    {id:'en02',w:'dog',       a:null,t:'ძაღლი',      lv:'A1'},
    {id:'en03',w:'cat',       a:null,t:'კატა',        lv:'A1'},
    {id:'en04',w:'school',    a:null,t:'სკოლა',      lv:'A1'},
    {id:'en05',w:'table',     a:null,t:'მაგიდა',     lv:'A1'},
    {id:'en06',w:'book',      a:null,t:'წიგნი',      lv:'A1'},
    {id:'en07',w:'city',      a:null,t:'ქალაქი',     lv:'A1'},
    {id:'en08',w:'man',       a:null,t:'კაცი',        lv:'A1'},
    {id:'en09',w:'woman',     a:null,t:'ქალი',        lv:'A1'},
    {id:'en10',w:'child',     a:null,t:'ბავშვი',     lv:'A1'},
    {id:'en11',w:'water',     a:null,t:'წყალი',      lv:'A1'},
    {id:'en12',w:'bread',     a:null,t:'პური',        lv:'A1'},
    {id:'en13',w:'car',       a:null,t:'მანქანა',    lv:'A1'},
    {id:'en14',w:'tree',      a:null,t:'ხე',          lv:'A1'},
    {id:'en15',w:'flower',    a:null,t:'ყვავილი',    lv:'A1'},
    {id:'en16',w:'eat',       a:null,t:'ჭამა',        lv:'A1'},
    {id:'en17',w:'drink',     a:null,t:'სმა',         lv:'A1'},
    {id:'en18',w:'go',        a:null,t:'წასვლა',     lv:'A1'},
    {id:'en19',w:'come',      a:null,t:'მოსვლა',     lv:'A1'},
    {id:'en20',w:'learn',     a:null,t:'სწავლა',     lv:'A1'},
    {id:'en21',w:'work',      a:null,t:'მუშაობა',    lv:'A2'},
    {id:'en22',w:'write',     a:null,t:'წერა',        lv:'A2'},
    {id:'en23',w:'read',      a:null,t:'კითხვა',     lv:'A2'},
    {id:'en24',w:'speak',     a:null,t:'საუბარი',    lv:'A2'},
    {id:'en25',w:'understand',a:null,t:'გაგება',     lv:'A2'},
    {id:'en26',w:'window',    a:null,t:'ფანჯარა',    lv:'A2'},
    {id:'en27',w:'door',      a:null,t:'კარი',        lv:'A2'},
    {id:'en28',w:'kitchen',   a:null,t:'სამზარეულო', lv:'A2'},
    {id:'en29',w:'street',    a:null,t:'ქუჩა',        lv:'A2'},
    {id:'en30',w:'friend',    a:null,t:'მეგობარი',   lv:'A2'},
    {id:'en31',w:'morning',   a:null,t:'დილა',        lv:'B1'},
    {id:'en32',w:'evening',   a:null,t:'საღამო',     lv:'B1'},
    {id:'en33',w:'night',     a:null,t:'ღამე',        lv:'B1'},
    {id:'en34',w:'week',      a:null,t:'კვირა',      lv:'B1'},
    {id:'en35',w:'month',     a:null,t:'თვე',         lv:'B1'},
  ],
  fr:[
    {id:'fr01',w:'maison',    a:"la",  t:'სახლი',      lv:'A1'},
    {id:'fr02',w:'chien',     a:"le",  t:'ძაღლი',      lv:'A1'},
    {id:'fr03',w:'chat',      a:"le",  t:'კატა',        lv:'A1'},
    {id:'fr04',w:'école',     a:"l'",  t:'სკოლა',      lv:'A1'},
    {id:'fr05',w:'table',     a:"la",  t:'მაგიდა',     lv:'A1'},
    {id:'fr06',w:'livre',     a:"le",  t:'წიგნი',      lv:'A1'},
    {id:'fr07',w:'ville',     a:"la",  t:'ქალაქი',     lv:'A1'},
    {id:'fr08',w:'homme',     a:"l'",  t:'კაცი',        lv:'A1'},
    {id:'fr09',w:'femme',     a:"la",  t:'ქალი',        lv:'A1'},
    {id:'fr10',w:'enfant',    a:"l'",  t:'ბავშვი',     lv:'A1'},
    {id:'fr11',w:'eau',       a:"l'",  t:'წყალი',      lv:'A1'},
    {id:'fr12',w:'pain',      a:"le",  t:'პური',        lv:'A1'},
    {id:'fr13',w:'voiture',   a:"la",  t:'მანქანა',    lv:'A1'},
    {id:'fr14',w:'arbre',     a:"l'",  t:'ხე',          lv:'A1'},
    {id:'fr15',w:'fleur',     a:"la",  t:'ყვავილი',    lv:'A1'},
    {id:'fr16',w:'manger',    a:null,  t:'ჭამა',        lv:'A1'},
    {id:'fr17',w:'boire',     a:null,  t:'სმა',         lv:'A1'},
    {id:'fr18',w:'aller',     a:null,  t:'წასვლა',     lv:'A1'},
    {id:'fr19',w:'venir',     a:null,  t:'მოსვლა',     lv:'A1'},
    {id:'fr20',w:'apprendre', a:null,  t:'სწავლა',     lv:'A1'},
    {id:'fr21',w:'travailler',a:null,  t:'მუშაობა',    lv:'A2'},
    {id:'fr22',w:'écrire',    a:null,  t:'წერა',        lv:'A2'},
    {id:'fr23',w:'lire',      a:null,  t:'კითხვა',     lv:'A2'},
    {id:'fr24',w:'parler',    a:null,  t:'საუბარი',    lv:'A2'},
    {id:'fr25',w:'comprendre',a:null,  t:'გაგება',     lv:'A2'},
    {id:'fr26',w:'fenêtre',   a:"la",  t:'ფანჯარა',    lv:'A2'},
    {id:'fr27',w:'porte',     a:"la",  t:'კარი',        lv:'A2'},
    {id:'fr28',w:'cuisine',   a:"la",  t:'სამზარეულო', lv:'A2'},
    {id:'fr29',w:'rue',       a:"la",  t:'ქუჩა',        lv:'A2'},
    {id:'fr30',w:'ami',       a:"l'",  t:'მეგობარი',   lv:'A2'},
  ],
  es:[
    {id:'es01',w:'casa',      a:'la', t:'სახლი',      lv:'A1'},
    {id:'es02',w:'perro',     a:'el', t:'ძაღლი',      lv:'A1'},
    {id:'es03',w:'gato',      a:'el', t:'კატა',        lv:'A1'},
    {id:'es04',w:'escuela',   a:'la', t:'სკოლა',      lv:'A1'},
    {id:'es05',w:'mesa',      a:'la', t:'მაგიდა',     lv:'A1'},
    {id:'es06',w:'libro',     a:'el', t:'წიგნი',      lv:'A1'},
    {id:'es07',w:'ciudad',    a:'la', t:'ქალაქი',     lv:'A1'},
    {id:'es08',w:'hombre',    a:'el', t:'კაცი',        lv:'A1'},
    {id:'es09',w:'mujer',     a:'la', t:'ქალი',        lv:'A1'},
    {id:'es10',w:'niño',      a:'el', t:'ბავშვი',     lv:'A1'},
    {id:'es11',w:'agua',      a:'el', t:'წყალი',      lv:'A1'},
    {id:'es12',w:'pan',       a:'el', t:'პური',        lv:'A1'},
    {id:'es13',w:'coche',     a:'el', t:'მანქანა',    lv:'A1'},
    {id:'es14',w:'árbol',     a:'el', t:'ხე',          lv:'A1'},
    {id:'es15',w:'flor',      a:'la', t:'ყვავილი',    lv:'A1'},
    {id:'es16',w:'comer',     a:null, t:'ჭამა',        lv:'A1'},
    {id:'es17',w:'beber',     a:null, t:'სმა',         lv:'A1'},
    {id:'es18',w:'ir',        a:null, t:'წასვლა',     lv:'A1'},
    {id:'es19',w:'venir',     a:null, t:'მოსვლა',     lv:'A1'},
    {id:'es20',w:'aprender',  a:null, t:'სწავლა',     lv:'A1'},
    {id:'es21',w:'trabajar',  a:null, t:'მუშაობა',    lv:'A2'},
    {id:'es22',w:'escribir',  a:null, t:'წერა',        lv:'A2'},
    {id:'es23',w:'leer',      a:null, t:'კითხვა',     lv:'A2'},
    {id:'es24',w:'hablar',    a:null, t:'საუბარი',    lv:'A2'},
    {id:'es25',w:'entender',  a:null, t:'გაგება',     lv:'A2'},
    {id:'es26',w:'ventana',   a:'la', t:'ფანჯარა',    lv:'A2'},
    {id:'es27',w:'puerta',    a:'la', t:'კარი',        lv:'A2'},
    {id:'es28',w:'cocina',    a:'la', t:'სამზარეულო', lv:'A2'},
    {id:'es29',w:'calle',     a:'la', t:'ქუჩა',        lv:'A2'},
    {id:'es30',w:'amigo',     a:'el', t:'მეგობარი',   lv:'A2'},
  ],
  ru:[
    {id:'ru01',w:'дом',       a:null,t:'სახლი',      lv:'A1'},
    {id:'ru02',w:'собака',    a:null,t:'ძაღლი',      lv:'A1'},
    {id:'ru03',w:'кошка',     a:null,t:'კატა',        lv:'A1'},
    {id:'ru04',w:'школа',     a:null,t:'სკოლა',      lv:'A1'},
    {id:'ru05',w:'стол',      a:null,t:'მაგიდა',     lv:'A1'},
    {id:'ru06',w:'книга',     a:null,t:'წიგნი',      lv:'A1'},
    {id:'ru07',w:'город',     a:null,t:'ქალაქი',     lv:'A1'},
    {id:'ru08',w:'мужчина',   a:null,t:'კაცი',        lv:'A1'},
    {id:'ru09',w:'женщина',   a:null,t:'ქალი',        lv:'A1'},
    {id:'ru10',w:'ребёнок',   a:null,t:'ბავშვი',     lv:'A1'},
    {id:'ru11',w:'вода',      a:null,t:'წყალი',      lv:'A1'},
    {id:'ru12',w:'хлеб',      a:null,t:'პური',        lv:'A1'},
    {id:'ru13',w:'машина',    a:null,t:'მანქანა',    lv:'A1'},
    {id:'ru14',w:'дерево',    a:null,t:'ხე',          lv:'A1'},
    {id:'ru15',w:'цветок',    a:null,t:'ყვავილი',    lv:'A1'},
    {id:'ru16',w:'есть',      a:null,t:'ჭამა',        lv:'A1'},
    {id:'ru17',w:'пить',      a:null,t:'სმა',         lv:'A1'},
    {id:'ru18',w:'идти',      a:null,t:'წასვლა',     lv:'A1'},
    {id:'ru19',w:'приходить', a:null,t:'მოსვლა',     lv:'A1'},
    {id:'ru20',w:'учиться',   a:null,t:'სწავლა',     lv:'A1'},
    {id:'ru21',w:'работать',  a:null,t:'მუშაობა',    lv:'A2'},
    {id:'ru22',w:'писать',    a:null,t:'წერა',        lv:'A2'},
    {id:'ru23',w:'читать',    a:null,t:'კითხვა',     lv:'A2'},
    {id:'ru24',w:'говорить',  a:null,t:'საუბარი',    lv:'A2'},
    {id:'ru25',w:'понимать',  a:null,t:'გაგება',     lv:'A2'},
    {id:'ru26',w:'окно',      a:null,t:'ფანჯარა',    lv:'A2'},
    {id:'ru27',w:'дверь',     a:null,t:'კარი',        lv:'A2'},
    {id:'ru28',w:'кухня',     a:null,t:'სამზარეულო', lv:'A2'},
    {id:'ru29',w:'улица',     a:null,t:'ქუჩა',        lv:'A2'},
    {id:'ru30',w:'друг',      a:null,t:'მეგობარი',   lv:'A2'},
  ],
};

/* ──────────────────────────────────────────────────────────────
   GRAMMAR DATA
──────────────────────────────────────────────────────────────── */
const GRAMMAR = {
  de:[
    {term:'der',rule:'მამრობითი სქესი',ex:'der Hund (ძაღლი), der Mann (კაცი), der Tisch (მაგიდა)'},
    {term:'die',rule:'მდედრობითი სქესი',ex:'die Katze (კატა), die Frau (ქალი), die Schule (სკოლა)'},
    {term:'das',rule:'საშუალო სქესი',ex:'das Kind (ბავშვი), das Buch (წიგნი), das Haus (სახლი)'},
    {term:'ich / du / er',rule:'ნაცვალსახელები: მე / შენ / ის',ex:'Ich lerne. Du lernst. Er lernt.'},
    {term:'S + V + O',rule:'გერმანული წინადადების წყობა',ex:'Ich lese das Buch. — მე ვკითხულობ წიგნს.'},
  ],
  en:[
    {term:'a / an',rule:'განუსაზღვრელი არტიკლი',ex:'a book (წიგნი), an apple (ვაშლი)'},
    {term:'the',rule:'განსაზღვრელი არტიკლი',ex:'the school (სკოლა), the city (ქალაქი)'},
    {term:'Present Simple',rule:'ჩვეულებრივი მოქმედება: S + V(s)',ex:'I learn. She learns. They learn.'},
    {term:'Past Simple',rule:'წარსული მოქმედება: V + -ed',ex:'I worked. She learned. They played.'},
    {term:'I / You / He',rule:'ნაცვალსახელები: მე / შენ / ის',ex:'I am, You are, He is, She is, They are.'},
  ],
  fr:[
    {term:'le / la',rule:'განსაზღვრელი არტიკლი (მამ./მდ.)',ex:'le livre (წიგნი), la maison (სახლი)'},
    {term:"l'",rule:'ხმოვნის წინ (le/la → l\')',ex:"l'arbre (ხე), l'eau (წყალი)"},
    {term:'les',rule:'მრავლობითი განსაზღვრელი',ex:'les livres (წიგნები), les maisons (სახლები)'},
    {term:'un / une',rule:'განუსაზღვრელი არტიკლი',ex:'un chat (კატა), une fleur (ყვავილი)'},
    {term:'je / tu / il',rule:'ნაცვალსახელები: მე / შენ / ის',ex:'Je parle. Tu parles. Il parle.'},
  ],
  es:[
    {term:'el / la',rule:'განსაზღვრელი არტიკლი (მამ./მდ.)',ex:'el libro (წიგნი), la casa (სახლი)'},
    {term:'un / una',rule:'განუსაზღვრელი არტიკლი',ex:'un perro (ძაღლი), una flor (ყვავილი)'},
    {term:'ser',rule:'მუდმივი თვისებები / ვინაობა',ex:'Soy estudiante. — მე სტუდენტი ვარ.'},
    {term:'estar',rule:'დროებითი მდგომარეობა',ex:'Estoy bien. — მე კარგად ვარ.'},
    {term:'yo / tú / él',rule:'ნაცვალსახელები: მე / შენ / ის',ex:'Yo hablo. Tú hablas. Él habla.'},
  ],
  ru:[
    {term:'Алфавит',rule:'33 ასო — კირილიკა',ex:'А Б В Г Д Е Ж З И К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ы Ь Э Ю Я'},
    {term:'я / ты / он',rule:'ნაცვალსახელები: მე / შენ / ის',ex:'Я учусь. Ты учишься. Он учится.'},
    {term:'Именительный',rule:'სახელობითი ბრუნვა (who? what?)',ex:'Студент читает книгу. — სტუდენტი კითხულობს.'},
    {term:'Глагол + -ть',rule:'ინფინიტივი -ть დაბოლოებით',ex:'учить (სწავლა), читать (კითხვა), писать (წერა)'},
    {term:'Мужской / Женский',rule:'სახელის სქესი',ex:'дом (სახლი) — мужской; школа (სკოლა) — женский'},
  ],
};


/* ══════════════════════════════════════════════════════════════
   LOCAL STORAGE HELPERS
══════════════════════════════════════════════════════════════ */
function ls(key, def = null) {
  try { const v = localStorage.getItem('lf_'+key); return v !== null ? JSON.parse(v) : def; }
  catch { return def; }
}
function lsSet(key, val) { localStorage.setItem('lf_'+key, JSON.stringify(val)); }

function getProgress()  { return ls('progress', {}); }
function getXpHistory() { return ls('xp_history', []); }
function addXp(amount, reason = '') {
  const p = S.profile;
  if (!p) return;
  p.total_xp = (p.total_xp || 0) + amount;
  const hist = getXpHistory();
  hist.push({ date: new Date().toISOString(), xp: amount, reason });
  if (hist.length > 60) hist.splice(0, hist.length - 60);
  lsSet('xp_history', hist);
  updateHeader();
  // async sync to Supabase
  sb.from('profiles').update({ total_xp: p.total_xp }).eq('id', p.id).then(() => {});
}


/* ══════════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════════ */
let _toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('visible'), 2400);
}


/* ══════════════════════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════════════════════ */
function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal').classList.add('active');
}
function closeModal() {
  document.getElementById('modal').classList.remove('active');
}


/* ══════════════════════════════════════════════════════════════
   HEADER UPDATE
══════════════════════════════════════════════════════════════ */
function updateHeader() {
  const p = S.profile;
  if (!p) return;
  const lang = LANGS[S.lang] || LANGS.de;
  document.getElementById('hdr-streak').textContent = `🔥 ${p.streak || 0}`;
  document.getElementById('hdr-xp').textContent     = `⭐ ${p.total_xp || 0} XP`;
  document.getElementById('hdr-avatar').textContent  = (p.username || '?')[0].toUpperCase();
  document.getElementById('app-brand-name').textContent = `${lang.flag} LinguaFlow`;
}


/* ══════════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════════ */
function goTo(page) {
  S.page = page;

  // page visibility
  document.querySelectorAll('.app-page').forEach(el => el.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  // nav highlight
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  // scroll to top
  document.querySelector('.app-content').scrollTop = 0;

  // render page
  const renders = {
    home       : renderHome,
    words      : renderWords,
    statistics : renderStatistics,
    challenges : renderChallenges,
    more       : renderMore,
  };
  if (renders[page]) renders[page]();
}


/* ══════════════════════════════════════════════════════════════
   ❶  HOME PAGE
══════════════════════════════════════════════════════════════ */
function renderHome() {
  const p   = S.profile;
  const lang = LANGS[S.lang] || LANGS.de;
  const vocab = VOCAB[S.lang] || [];
  const level = p?.current_level || 'A1';
  const xp    = p?.total_xp || 0;
  const streak= p?.streak   || 0;
  const uname = p?.username || 'სტუმარი';
  const prog  = getProgress();
  const wordsLearned = Object.keys(prog).filter(k => k.startsWith(S.lang+'_')).length;
  const lvIdx = LEVELS.indexOf(level);
  const nextLv= LEVELS[lvIdx + 1] || 'C2';
  const pct   = Math.min(100, Math.round((xp % 500) / 5));

  const levelCards = LEVELS.map((lv, i) => {
    const isActive = lv === level;
    const isLocked = i > lvIdx;
    const p_fill   = isActive ? pct : (i < lvIdx ? 100 : 0);
    return `
      <div class="level-card ${lv.toLowerCase()}">
        <h3>${lv}</h3>
        <p>${LEVEL_NAMES[lv]}</p>
        ${isLocked
          ? '<div style="margin-top:22px;font-size:26px">🔒</div>'
          : `<div class="level-progress"><span style="width:${p_fill}%"></span></div>`
        }
      </div>`;
  }).join('');

  document.getElementById('page-home').innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <h1>გამარჯობა, <span>${uname}</span> 👋</h1>
        <p>${lang.flag} ${lang.name} — ${vocab.length} სიტყვა</p>
      </div>
      <div class="progress-area">
        <div class="level-box">
          <small>დონე</small>
          <strong>${level}</strong>
        </div>
        <div class="progress-info">
          <div class="progress-label">
            <span>შემდეგი: ${nextLv}</span>
            <span>${pct}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
      </div>
    </section>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-icon">🔥</div>
        <div class="stat-text">
          <div class="stat-label">Streak</div>
          <div class="stat-value">${streak}</div>
          <div class="stat-sub">დღე</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-text">
          <div class="stat-label">XP</div>
          <div class="stat-value">${xp}</div>
          <div class="stat-sub">გამოცდილება</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚡</div>
        <div class="stat-text">
          <div class="stat-label">სიტყვები</div>
          <div class="stat-value">${wordsLearned}</div>
          <div class="stat-sub">ისწავლე</div>
        </div>
      </div>
    </div>

    <div class="feature-grid">
      <div class="feature-card flashcards" id="home-btn-fc">
        <h2>ფლეშქარდები</h2>
        <p>ისწავლე ახალი სიტყვები</p>
        <button class="feature-button">→</button>
      </div>
      <div class="feature-card grammar" id="home-btn-gr">
        <h2>გრამატიკა</h2>
        <p>ისწავლე ძირითადი წესები</p>
        <button class="feature-button">→</button>
      </div>
    </div>

    <div class="daily-goal">
      <div class="goal-icon">🎯</div>
      <div class="goal-content">
        <h3>დღის სავარჯიშო</h3>
        <p>${wordsLearned}/${vocab.length} სიტყვა ისწავლე • ${vocab.length - wordsLearned} დარჩა</p>
      </div>
      <button class="goal-button" id="home-btn-review">ვარჯიში →</button>
    </div>

    <div class="section-title">
      <h2>დონეები</h2>
      <button class="view-all" id="home-btn-levels">ყველა ›</button>
    </div>
    <div class="levels">${levelCards}</div>
  `;

  document.getElementById('home-btn-fc').addEventListener('click', () => startFlashcards(10));
  document.getElementById('home-btn-gr').addEventListener('click', showGrammar);
  document.getElementById('home-btn-review').addEventListener('click', () => startFlashcards(10));
  document.getElementById('home-btn-levels').addEventListener('click', showLevelsModal);
}


/* ══════════════════════════════════════════════════════════════
   ❷  WORDS PAGE
══════════════════════════════════════════════════════════════ */
function renderWords() {
  const lang = LANGS[S.lang] || LANGS.de;
  const prog = getProgress();

  const langTabs = Object.entries(LANGS).map(([code, l]) => `
    <button class="level-tab${S.lang === code ? ' active' : ''}" data-lang="${code}">
      ${l.flag} ${l.name}
    </button>`).join('');

  const lvTabs = ['all', ...LEVELS].map(lv => `
    <button class="level-tab${S.filter === lv ? ' active' : ''}" data-lv="${lv}">
      ${lv === 'all' ? 'ყველა' : lv}
    </button>`).join('');

  document.getElementById('page-words').innerHTML = `
    <div class="page-header">
      <h1>სიტყვები</h1>
      <p>${lang.flag} ${lang.name} · ${VOCAB[S.lang]?.length || 0} სიტყვა</p>
    </div>

    <div class="level-tabs" id="words-lang-tabs">${langTabs}</div>

    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input class="search-input" id="words-search" placeholder="სიტყვის ძებნა…" value="${S.search}">
    </div>

    <div class="level-tabs" id="words-lv-tabs">${lvTabs}</div>

    <div class="word-grid" id="word-grid"></div>
  `;

  renderWordGrid();

  document.getElementById('words-search').addEventListener('input', e => {
    S.search = e.target.value.toLowerCase();
    renderWordGrid();
  });
  document.getElementById('words-lang-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    S.lang   = btn.dataset.lang;
    S.search = '';
    S.filter = 'all';
    updateHeader();
    if (S.profile) sb.from('profiles').update({ selected_language: S.lang }).eq('id', S.profile.id).then(() => {});
    renderWords();
  });
  document.getElementById('words-lv-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-lv]');
    if (!btn) return;
    S.filter = btn.dataset.lv;
    renderWordGrid();
    document.querySelectorAll('#words-lv-tabs .level-tab').forEach(b => b.classList.toggle('active', b.dataset.lv === S.filter));
  });
}

function renderWordGrid() {
  const vocab  = VOCAB[S.lang] || [];
  const prog   = getProgress();
  const filtered = vocab.filter(v => {
    const matchLv = S.filter === 'all' || v.lv === S.filter;
    const matchSr = !S.search || v.w.toLowerCase().includes(S.search) || v.t.includes(S.search);
    return matchLv && matchSr;
  });

  const html = filtered.length
    ? filtered.map(v => {
        const learned = prog[S.lang + '_' + v.id] ? '✓ ' : '';
        return `
          <div class="word-card" data-id="${v.id}">
            ${v.a ? `<div class="word-card-article">${v.a}</div>` : ''}
            <div class="word-card-word">${learned}${v.w}</div>
            <div class="word-card-translation">${v.t}</div>
            <div class="word-card-level">${v.lv}</div>
          </div>`;
      }).join('')
    : '<p style="color:var(--muted);padding:20px 0">სიტყვა ვერ მოიძებნა</p>';

  document.getElementById('word-grid').innerHTML = html;
  document.getElementById('word-grid').addEventListener('click', e => {
    const card = e.target.closest('.word-card');
    if (!card) return;
    const word = (VOCAB[S.lang] || []).find(v => v.id === card.dataset.id);
    if (word) openWordModal(word);
  });
}

function openWordModal(word) {
  const prog = getProgress();
  const key  = S.lang + '_' + word.id;
  const done = !!prog[key];
  openModal(word.w, `
    <div style="text-align:center;padding:20px 0">
      ${word.a ? `<div style="font-size:16px;color:var(--cyan);font-weight:700;margin-bottom:8px">${word.a}</div>` : ''}
      <div style="font-size:54px;font-weight:800;letter-spacing:-2px;margin-bottom:16px">${word.w}</div>
      <div style="font-size:26px;color:var(--muted);margin-bottom:8px">${word.t}</div>
      <div style="font-size:13px;color:rgba(160,170,200,.5);margin-bottom:28px">
        ${LANGS[S.lang]?.name} • ${word.lv}
      </div>
      ${done
        ? `<div style="color:#00c896;font-size:15px;font-weight:700">✓ ისწავლე</div>`
        : `<button onclick="markLearned('${word.id}')" style="padding:14px 36px;border:none;border-radius:14px;background:linear-gradient(90deg,#7425ff,#23d0cf);color:#fff;font-size:16px;font-weight:700;font-family:inherit;cursor:pointer">✓ ვისწავლე (+20 XP)</button>`
      }
    </div>
  `);
}

window.markLearned = function(wordId) {
  const prog = getProgress();
  const key  = S.lang + '_' + wordId;
  if (!prog[key]) {
    prog[key] = { date: new Date().toISOString() };
    lsSet('progress', prog);
    addXp(20, 'word_learned');
    toast('✅ +20 XP — სიტყვა ისწავლე!');
  }
  closeModal();
  renderWordGrid();
};


/* ══════════════════════════════════════════════════════════════
   ❸  STATISTICS PAGE
══════════════════════════════════════════════════════════════ */
function renderStatistics() {
  const p    = S.profile;
  const prog = getProgress();
  const hist = getXpHistory();

  const totalWords = Object.keys(prog).length;
  const xp         = p?.total_xp || 0;
  const streak     = p?.streak   || 0;
  const langs      = Object.keys(LANGS);

  // weekly chart: last 7 days
  const days    = ['ორ','სამ','ოთხ','ხუთ','პარ','შაბ','კვ'];
  const today   = new Date();
  const weekly  = Array(7).fill(0);
  hist.forEach(h => {
    const d = new Date(h.date);
    const diff = Math.floor((today - d) / 86400000);
    if (diff >= 0 && diff < 7) weekly[6 - diff] += h.xp;
  });
  const maxXp = Math.max(...weekly, 1);
  const barCols = weekly.map((v, i) => `
    <div class="bar-col">
      <div class="bar-fill" style="height:${Math.round((v/maxXp)*100)}%"></div>
      <div class="bar-label">${days[(today.getDay() + i - 6 + 7) % 7]}</div>
    </div>`).join('');

  // per-language progress
  const langRows = langs.map(code => {
    const total   = VOCAB[code]?.length || 1;
    const learned = Object.keys(prog).filter(k => k.startsWith(code + '_')).length;
    const pct     = Math.round((learned / total) * 100);
    return `
      <div class="lang-progress-row">
        <div class="lang-flag">${LANGS[code].flag}</div>
        <div class="lang-progress-info">
          <div class="lang-progress-name">${LANGS[code].name}</div>
          <div class="lang-progress-bar"><span style="width:${pct}%"></span></div>
        </div>
        <div class="lang-progress-pct">${learned}/${total}</div>
      </div>`;
  }).join('');

  document.getElementById('page-statistics').innerHTML = `
    <div class="page-header">
      <h1>სტატისტიკა</h1>
      <p>შენი პროგრესი</p>
    </div>

    <div class="stats-big">
      <div class="stat-big-card">
        <div class="stat-big-icon">⭐</div>
        <div class="stat-big-value">${xp}</div>
        <div class="stat-big-label">სულ XP</div>
      </div>
      <div class="stat-big-card">
        <div class="stat-big-icon">🔥</div>
        <div class="stat-big-value">${streak}</div>
        <div class="stat-big-label">Streak დღე</div>
      </div>
      <div class="stat-big-card">
        <div class="stat-big-icon">⚡</div>
        <div class="stat-big-value">${totalWords}</div>
        <div class="stat-big-label">ნასწავლი სიტყვა</div>
      </div>
      <div class="stat-big-card">
        <div class="stat-big-icon">🌍</div>
        <div class="stat-big-value">${langs.filter(c => Object.keys(prog).some(k=>k.startsWith(c+'_'))).length}</div>
        <div class="stat-big-label">ენა დაწყებული</div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-title">📊 კვირის XP</div>
      <div class="bar-chart">${barCols}</div>
    </div>

    <div class="lang-progress-card">
      <div class="chart-title">🌐 ენები</div>
      ${langRows}
    </div>
  `;
}


/* ══════════════════════════════════════════════════════════════
   ❹  CHALLENGES PAGE
══════════════════════════════════════════════════════════════ */
function renderChallenges() {
  const prog = getProgress();
  const lang = LANGS[S.lang] || LANGS.de;
  const vocab = VOCAB[S.lang] || [];
  const learned = Object.keys(prog).filter(k => k.startsWith(S.lang + '_')).length;

  const todayKey = new Date().toDateString();
  const dailyDone = ls('daily_done') === todayKey;

  const challenges = [
    {
      icon:'⚡', title:'კვირის ჩელენჯი',
      sub:`${S.lang.toUpperCase()}: ისწავლე 30 სიტყვა`,
      pct: Math.min(100, Math.round((learned/30)*100)),
      val: Math.min(learned, 30), total: 30,
      xp: 300, done: learned >= 30,
    },
    {
      icon:'🔥', title:'Streak ჩელენჯი',
      sub:`შეინარჩუნე 7-დღიანი streak`,
      pct: Math.min(100, Math.round(((S.profile?.streak||0)/7)*100)),
      val: Math.min(S.profile?.streak||0, 7), total: 7,
      xp: 500, done: (S.profile?.streak||0) >= 7,
    },
    {
      icon:'🌍', title:'მულტი-ენა',
      sub:'დაიწყე 3 ენა',
      pct: Math.min(100, Math.round((Object.keys(LANGS).filter(c=>Object.keys(prog).some(k=>k.startsWith(c+'_'))).length/3)*100)),
      val: Object.keys(LANGS).filter(c=>Object.keys(prog).some(k=>k.startsWith(c+'_'))).length,
      total: 3, xp: 200,
      done: Object.keys(LANGS).filter(c=>Object.keys(prog).some(k=>k.startsWith(c+'_'))).length >= 3,
    },
  ];

  const challHtml = challenges.map(c => `
    <div class="challenge-item ${c.done ? 'challenge-done' : ''}">
      <div class="challenge-item-icon">${c.icon}</div>
      <div class="challenge-item-content">
        <div class="challenge-item-title">${c.done ? '✓ ' : ''}${c.title}</div>
        <div class="challenge-item-sub">${c.sub}</div>
        <div class="challenge-item-track">
          <span style="width:${c.pct}%"></span>
        </div>
      </div>
      <div class="challenge-item-xp">+${c.xp} XP</div>
    </div>`).join('');

  document.getElementById('page-challenges').innerHTML = `
    <div class="page-header">
      <h1>ჩელენჯები</h1>
      <p>გამოწვევები და ჯილდოები</p>
    </div>

    <div class="challenge-daily">
      <div class="challenge-badge">⚡ დღის ჩელენჯი</div>
      <div class="challenge-xp-badge">+100 XP</div>
      <div class="challenge-daily-title">${lang.flag} 10 ფლეშქარდი</div>
      <div class="challenge-daily-sub">${lang.name} — 10 სიტყვა 5 წუთში
        ${dailyDone ? ' · ✓ დასრულებული' : ''}</div>
      <button class="challenge-daily-btn" id="ch-daily-btn"
        ${dailyDone ? 'disabled style="opacity:.5"' : ''}>
        ${dailyDone ? '✓ შესრულებული' : 'ჩელენჯის დაწყება →'}
      </button>
    </div>

    <div class="challenges-list">${challHtml}</div>
  `;

  if (!dailyDone) {
    document.getElementById('ch-daily-btn').addEventListener('click', () => {
      lsSet('daily_done', new Date().toDateString());
      startFlashcards(10);
    });
  }
}


/* ══════════════════════════════════════════════════════════════
   ❺  MORE / PROFILE PAGE
══════════════════════════════════════════════════════════════ */
function renderMore() {
  const p    = S.profile;
  const uname= p?.username || '?';
  const email= S.user?.email || '';
  const level= p?.current_level || 'A1';
  const lang = LANGS[S.lang] || LANGS.de;

  const langOptions = Object.entries(LANGS).map(([code, l]) => `
    <div class="lang-option${S.lang === code ? ' selected' : ''}" data-lang="${code}">
      <div class="lang-flag-big">${l.flag}</div>
      <div>
        <div class="lang-opt-name">${l.name}</div>
        <div class="lang-opt-label">${l.label}</div>
      </div>
    </div>`).join('');

  document.getElementById('page-more').innerHTML = `
    <div class="page-header">
      <h1>მეტი</h1>
      <p>პროფილი და პარამეტრები</p>
    </div>

    <div class="profile-card">
      <div class="profile-avatar-big">${uname[0]?.toUpperCase() || '?'}</div>
      <div class="profile-info">
        <div class="profile-username">${uname}</div>
        <div class="profile-email">${email}</div>
        <div class="profile-badges">
          <span class="profile-badge badge-level">${level}</span>
          <span class="profile-badge badge-lang">${lang.flag} ${lang.name}</span>
        </div>
      </div>
    </div>

    <div class="section-card">
      <div class="section-card-label">🌍 ენის არჩევა</div>
      <div class="lang-options" id="more-lang-opts">${langOptions}</div>
    </div>

    <div class="section-card">
      <div class="section-card-label">📊 ანგარიშის ინფო</div>
      <div class="setting-row">
        <span class="setting-label">სულ XP</span>
        <span class="setting-value">${p?.total_xp || 0}</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">Streak</span>
        <span class="setting-value">${p?.streak || 0} დღე</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">ნასწავლი სიტყვები</span>
        <span class="setting-value">${Object.keys(getProgress()).length}</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">მიმდინარე დონე</span>
        <span class="setting-value">${level}</span>
      </div>
    </div>

    <div class="section-card">
      <div class="section-card-label">⚙️ სხვა</div>
      <div class="setting-row">
        <span class="setting-label">ვერსია</span>
        <span class="setting-value">1.0.0</span>
      </div>
      <div class="setting-row">
        <span class="setting-label">ენის ინტერფეისი</span>
        <span class="setting-value">ქართული</span>
      </div>
      <button class="logout-btn" id="btn-logout" style="margin-top:14px">→ გასვლა</button>
    </div>
  `;

  document.getElementById('more-lang-opts').addEventListener('click', e => {
    const opt = e.target.closest('[data-lang]');
    if (!opt) return;
    const newLang = opt.dataset.lang;
    S.lang = newLang;
    updateHeader();
    if (p) sb.from('profiles').update({ selected_language: newLang }).eq('id', p.id).then(() => {});
    toast(`${LANGS[newLang].flag} ${LANGS[newLang].name} — არჩეულია!`);
    renderMore();
  });

  document.getElementById('btn-logout').addEventListener('click', doLogout);
}


/* ══════════════════════════════════════════════════════════════
   FLASHCARD EXERCISE
══════════════════════════════════════════════════════════════ */
function startFlashcards(count = 10) {
  const vocab  = VOCAB[S.lang] || [];
  const prog   = getProgress();
  // prefer unlearned first
  const unlearned = vocab.filter(v => !prog[S.lang + '_' + v.id]);
  const pool      = unlearned.length >= count
    ? unlearned.slice(0, count)
    : [...unlearned, ...vocab.filter(v => prog[S.lang+'_'+v.id])].slice(0, count);

  if (!pool.length) { toast('სიტყვები ვერ მოიძებნა'); return; }

  S.fcQueue   = pool;
  S.fcIndex   = 0;
  S.fcFlipped = false;
  S.fcKnew    = 0;

  document.getElementById('fc-overlay').classList.add('active');
  showFCCard();
}

function showFCCard() {
  const total = S.fcQueue.length;
  const idx   = S.fcIndex;

  if (idx >= total) { showFCSummary(); return; }

  const word  = S.fcQueue[idx];
  const prog  = Math.round(((idx) / total) * 100);

  document.getElementById('fc-prog').style.width    = prog + '%';
  document.getElementById('fc-counter').textContent = `${idx + 1} / ${total}`;
  document.getElementById('fc-article').textContent = word.a || '';
  document.getElementById('fc-word').textContent    = word.w;
  document.getElementById('fc-trans').textContent   = word.t;
  document.getElementById('fc-lang').textContent    = LANGS[S.lang]?.name || '';

  // reset flip
  S.fcFlipped = false;
  document.getElementById('fc-card').classList.remove('flipped');
  document.getElementById('fc-actions').style.display = 'none';
  document.getElementById('fc-hint').style.display    = '';
}

function showFCSummary() {
  const total  = S.fcQueue.length;
  const xpEarned = S.fcKnew * 15 + (total - S.fcKnew) * 3;
  addXp(xpEarned, 'flashcards');

  const wrap = document.getElementById('fc-card-wrap');
  wrap.innerHTML = `
    <div class="fc-summary">
      <div class="fc-summary-emoji">${S.fcKnew >= total * .7 ? '🏆' : '💪'}</div>
      <div class="fc-summary-title">${S.fcKnew >= total * .7 ? 'შესანიშნავია!' : 'კარგი მცდელობა!'}</div>
      <div class="fc-summary-sub">სწორი: ${S.fcKnew} / ${total}</div>
      <div class="fc-summary-xp">+${xpEarned} XP</div>
      <button class="fc-summary-btn" id="fc-done">დახურვა</button>
    </div>
  `;
  document.getElementById('fc-prog').style.width = '100%';
  document.getElementById('fc-actions').style.display = 'none';
  document.getElementById('fc-hint').style.display    = 'none';

  document.getElementById('fc-done').addEventListener('click', closeFCOverlay);
}

function closeFCOverlay() {
  document.getElementById('fc-overlay').classList.remove('active');
  // restore card area
  document.getElementById('fc-card-wrap').innerHTML = `
    <div class="fc-card" id="fc-card">
      <div class="fc-card-inner">
        <div class="fc-face fc-front" id="fc-front">
          <div class="fc-article" id="fc-article"></div>
          <div class="fc-word"    id="fc-word">---</div>
          <div class="fc-tap-hint">შეეხე გადასაბრუნებლად</div>
        </div>
        <div class="fc-face fc-back" id="fc-back">
          <div class="fc-lang"        id="fc-lang">ქართული</div>
          <div class="fc-translation" id="fc-trans">---</div>
        </div>
      </div>
    </div>`;
  bindFCCard();
  if (S.page === 'home') renderHome();
  if (S.page === 'statistics') renderStatistics();
}

function bindFCCard() {
  const card = document.getElementById('fc-card');
  if (!card) return;
  card.addEventListener('click', () => {
    if (S.fcFlipped) return;
    S.fcFlipped = true;
    card.classList.add('flipped');
    document.getElementById('fc-actions').style.display = 'flex';
    document.getElementById('fc-hint').style.display    = 'none';
  });
}


/* ══════════════════════════════════════════════════════════════
   GRAMMAR MODAL
══════════════════════════════════════════════════════════════ */
function showGrammar() {
  const items = GRAMMAR[S.lang] || [];
  const lang  = LANGS[S.lang] || LANGS.de;
  const html  = items.map(g => `
    <div class="grammar-item">
      <div class="grammar-term">${g.term}</div>
      <div class="grammar-rule">${g.rule}</div>
      <div class="grammar-example">${g.ex}</div>
    </div>`).join('');
  openModal(`${lang.flag} გრამატიკა`, html);
}

function showLevelsModal() {
  const html = LEVELS.map(lv => `
    <div class="modal-item">
      <strong>${lv}</strong>
      <span>${LEVEL_NAMES[lv]}</span>
    </div>`).join('');
  openModal('📚 დონეები', html);
}


/* ══════════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════════ */
function showAuthView(name) {
  document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('btn-login');
  errEl.textContent = '';
  btn.disabled = true; btn.textContent = 'შესვლა…';

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  btn.disabled = false; btn.textContent = 'შესვლა →';

  if (error) { errEl.textContent = translateAuthError(error.message); return; }
  await afterAuth(data.user);
}

async function doRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const pass     = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('reg-error');
  const btn      = document.getElementById('btn-register');
  errEl.textContent = '';

  if (!username || username.length < 2) { errEl.textContent = 'სახელი ძალიან მოკლეა'; return; }
  if (!email)    { errEl.textContent = 'შეიყვანე ელ-ფოსტა'; return; }
  if (pass.length < 6) { errEl.textContent = 'პაროლი მინ. 6 სიმბოლო'; return; }

  btn.disabled = true; btn.textContent = 'რეგისტრაცია…';
  const { data, error } = await sb.auth.signUp({
    email, password: pass,
    options: { data: { username } },
  });
  btn.disabled = false; btn.textContent = 'დარეგისტრირება →';

  if (error) { errEl.textContent = translateAuthError(error.message); return; }
  if (data.user) await afterAuth(data.user);
}

async function doLogout() {
  await sb.auth.signOut();
  S.user    = null;
  S.profile = null;
  document.getElementById('app-layer').style.display  = 'none';
  document.getElementById('auth-layer').style.display = '';
  showAuthView('login');
}

async function afterAuth(user) {
  S.user = user;
  await loadProfile(user);
  document.getElementById('auth-layer').style.display = 'none';
  document.getElementById('app-layer').style.display  = '';
  updateHeader();
  goTo('home');
  checkStreak();
}

async function loadProfile(user) {
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if (data) {
    S.profile = data;
    S.lang    = data.selected_language || 'de';
  } else {
    // fallback: profile not yet created (race condition)
    const username = user.user_metadata?.username || user.email?.split('@')[0] || 'სტუმარი';
    S.profile = { id: user.id, username, selected_language: 'de', current_level: 'A1', total_xp: 0, streak: 0 };
    S.lang    = 'de';
    await sb.from('profiles').upsert(S.profile);
  }
}

function checkStreak() {
  const p = S.profile;
  if (!p) return;
  const today = new Date().toDateString();
  const last  = ls('last_active');
  const yest  = new Date(Date.now() - 86400000).toDateString();

  if (last === today) return;
  if (last === yest) {
    p.streak = (p.streak || 0) + 1;
  } else if (last !== today) {
    p.streak = 1;
  }
  lsSet('last_active', today);
  sb.from('profiles').update({ streak: p.streak, last_activity_date: new Date().toISOString() }).eq('id', p.id).then(() => {});
}

function translateAuthError(msg) {
  if (msg.includes('Invalid login'))        return 'ელ-ფოსტა ან პაროლი არასწორია';
  if (msg.includes('Email not confirmed'))  return 'გთხოვ, ელ-ფოსტა დაადასტური';
  if (msg.includes('already registered'))   return 'ეს ელ-ფოსტა უკვე გამოყენებულია';
  if (msg.includes('Password should'))      return 'პაროლი მინ. 6 სიმბოლო';
  if (msg.includes('Unable to validate'))   return 'ელ-ფოსტის ფორმატი არასწორია';
  return msg;
}


/* ══════════════════════════════════════════════════════════════
   EVENT BINDINGS
══════════════════════════════════════════════════════════════ */
function bindGlobal() {
  // auth toggles
  document.getElementById('go-register').addEventListener('click', () => showAuthView('register'));
  document.getElementById('go-login').addEventListener('click',    () => showAuthView('login'));
  document.getElementById('btn-login').addEventListener('click',   doLogin);
  document.getElementById('btn-register').addEventListener('click',doRegister);

  // enter key in auth inputs
  ['login-email','login-password'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => e.key === 'Enter' && doLogin()));
  ['reg-username','reg-email','reg-password'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => e.key === 'Enter' && doRegister()));

  // bottom nav
  document.querySelectorAll('.nav-item').forEach(btn =>
    btn.addEventListener('click', () => goTo(btn.dataset.page)));

  // modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) closeModal();
  });

  // flashcard overlay
  document.getElementById('fc-close').addEventListener('click', closeFCOverlay);
  document.getElementById('fc-no').addEventListener('click', () => {
    S.fcIndex++;
    showFCCard();
  });
  document.getElementById('fc-yes').addEventListener('click', () => {
    S.fcKnew++;
    // mark progress
    const word = S.fcQueue[S.fcIndex];
    if (word) {
      const prog = getProgress();
      const key  = S.lang + '_' + word.id;
      if (!prog[key]) { prog[key] = { date: new Date().toISOString() }; lsSet('progress', prog); }
    }
    S.fcIndex++;
    showFCCard();
  });

  // ESC key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeFCOverlay();
    }
  });

  // bind initial flashcard
  bindFCCard();
}


/* ══════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════ */
async function init() {
  bindGlobal();

  // check existing session
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    await afterAuth(session.user);
  }

  // listen for auth changes
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user && !S.user) {
      await afterAuth(session.user);
    }
    if (event === 'SIGNED_OUT') {
      S.user = null; S.profile = null;
    }
  });
}

init();
