/* ══════════════════════════════════════════════════════════════
   LinguaFlow · pages/home.js — Home Page
══════════════════════════════════════════════════════════════ */

function renderHome() {
  const p     = S.profile;
  const lang  = LANGS[S.lang] || LANGS.de;
  const vocab = getVocab(S.lang);
  const level = p?.current_level || 'A1';
  const xp    = p?.total_xp     || 0;
  const streak= p?.streak       || 0;
  const uname = p?.username     || 'სტუმარი';
  const prog  = getProgress();

  const wordsLearned = Object.keys(prog).filter(k => k.startsWith(S.lang + '_')).length;
  const lvIdx  = LEVELS.indexOf(level);
  const nextLv = LEVELS[lvIdx + 1] || 'C2';
  const pct    = Math.min(100, Math.round((xp % 500) / 5));

  const learnedCount = typeof getLearnedWords === 'function' ? getLearnedWords(S.lang).length : 0;
  const reviewCount  = typeof getReviewWords  === 'function' ? getReviewWords(S.lang).length  : 0;

  const levelCards = LEVELS.map(lv => `
    <div class="level-card ${lv.toLowerCase()}">
      <img src="assets/images/${lv}.svg" alt="${lv}">
    </div>`).join('');

  document.getElementById('page-home').innerHTML = `

    <section class="hero">
      <div class="hero-content">
        <h1>გამარჯობა, <span>${uname}</span> 👋</h1>
        <p>${lang.flag} ${lang.name} — ${vocab.length} სიტყვა</p>
      </div>
      <img src="assets/images/hero-book.svg" class="hero-image" alt="">
      <div class="progress-area">
        <div class="level-box"><small>დონე</small><strong>${level}</strong></div>
        <div class="progress-info">
          <div class="progress-label">
            <span>შემდეგი: ${nextLv}</span><span>${pct}%</span>
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
          <div class="stat-sub">გამოცდ.</div>
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
        <img src="assets/images/flashcards.svg" alt="">
      </div>
      <div class="feature-card grammar" id="home-btn-gr">
        <h2>გრამატიკა</h2>
        <p>ისწავლე ძირითადი წესები</p>
        <button class="feature-button">→</button>
        <img src="assets/images/grammar.svg" alt="">
      </div>
    </div>

    <div class="daily-goal">
      <div class="goal-icon">🎯</div>
      <div class="goal-content">
        <h3>დღის სავარჯიშო</h3>
        <p>${wordsLearned}/${vocab.length} სიტყვა ისწავლე &middot; ${vocab.length - wordsLearned} დარჩა</p>
      </div>
      <button class="goal-button" id="home-btn-daily">ვარჯიში →</button>
    </div>

    <!-- QUICK ACCESS: Learned + Review -->
    <div class="home-quick-row">
      <div class="home-qcard hqc-learned" id="hqc-learned">
        <div class="hqc-left">
          <div class="hqc-icon">✅</div>
          <div class="hqc-info">
            <div class="hqc-title">ნასწავლი სიტყვები</div>
            <div class="hqc-sub">${learnedCount} სიტყვა</div>
          </div>
        </div>
        <span class="hqc-arr">›</span>
      </div>
      <div class="home-qcard hqc-review" id="hqc-review">
        <div class="hqc-left">
          <div class="hqc-icon">🔄</div>
          <div class="hqc-info">
            <div class="hqc-title">გასამეობელი</div>
            <div class="hqc-sub">${reviewCount} სიტყვა</div>
          </div>
        </div>
        <span class="hqc-arr">›</span>
      </div>
    </div>

    <div class="section-title">
      <h2>დონეები</h2>
      <button class="view-all" id="home-btn-levels">ყველა ›</button>
    </div>
    <div class="levels">${levelCards}</div>
  `;

  document.getElementById('home-btn-fc').addEventListener('click', () => startFlashcards(10));
  document.getElementById('home-btn-gr').addEventListener('click', showGrammar);
  document.getElementById('home-btn-daily').addEventListener('click', () => startFlashcards(10));
  document.getElementById('home-btn-levels').addEventListener('click', showLevelsModal);
  document.getElementById('hqc-learned').addEventListener('click', () => goTo('learned'));
  document.getElementById('hqc-review').addEventListener('click',  () => goTo('review'));
}
