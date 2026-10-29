let SEED = { tunes: [], carSpecs: {} };
let CARS = {};
let CAR_NAMES = [];
let DISCIPLINES = {};
let DISCIPLINE_NAMES = [];
let activeDiscipline = null;
let searchSeq = 0; // guards against out-of-order fetch responses

const searchInput = document.getElementById('searchInput');
const searchResultsEl = document.getElementById('searchResults');
const resultsSection = document.getElementById('resultsSection');
const allCarsSection = document.getElementById('allCarsSection');
const filterPillsEl = document.getElementById('filterPills');

function normalize(s){ return s.toLowerCase().trim(); }

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function loadSeed(){
  const res = await fetch('/api/seed');
  SEED = await res.json();

  CARS = {};
  SEED.tunes.forEach(t => {
    if(!CARS[t.car]) CARS[t.car] = [];
    CARS[t.car].push(t);
  });
  CAR_NAMES = Object.keys(CARS).sort((a,b) => a.localeCompare(b));

  DISCIPLINES = {};
  SEED.tunes.forEach(t => {
    if(!DISCIPLINES[t.discipline]) DISCIPLINES[t.discipline] = [];
    DISCIPLINES[t.discipline].push(t);
  });
  DISCIPLINE_NAMES = Object.keys(DISCIPLINES).sort((a,b) => DISCIPLINES[b].length - DISCIPLINES[a].length);

  document.getElementById('bannerCarCount').textContent = CAR_NAMES.length;
  renderFilterPills();
}

function formatCarSpecs(carName){
  const s = SEED.carSpecs[carName];
  if(!s) return '';
  const piText = s.piMin != null ? `${s.piMin}–${s.piMax} PI` : `${s.pi} PI`;
  const bhpText = s.bhpMin != null ? `${s.bhpMin}–${s.bhpMax} BHP` : `${s.bhp} BHP`;
  const yearText = s.years || s.year;
  const noteText = s.note ? ` — ${escapeHtml(s.note)}` : '';
  return `<p class="car-specs">Stock: <span class="spec-pi">${escapeHtml(s.cls)}-Class (${piText})</span> · ${escapeHtml(s.dt)} · ${bhpText} · ${escapeHtml(String(yearText))}${noteText}</p>`;
}

function matchCars(query){
  const q = normalize(query);
  if(!q) return [];
  return CAR_NAMES.filter(name => normalize(name).includes(q)).slice(0, 12);
}

function renderTuneCard(t){
  return `
    <div class="tune-card">
      <div class="tune-card-top">
        <div>
          <p class="tune-title">${escapeHtml(t.title)}</p>
          <p class="tune-meta">${escapeHtml(t.car)}</p>
          ${formatCarSpecs(t.car)}
        </div>
        <div class="tune-badges">
          <span class="badge cls">Class ${escapeHtml(t.class)}</span>
          <span class="badge disc">${escapeHtml(t.discipline)}</span>
        </div>
      </div>
      <div class="tune-code-row">
        <span class="code-label">Share code</span>
        <span class="code-value mono">${escapeHtml(t.code)}</span>
        <button type="button" class="copy-btn" data-code="${escapeHtml(t.code)}" onclick="copyCode(this)">Copy</button>
      </div>
      <div class="tune-foot">
        <span>Tuned by <strong>${escapeHtml(t.tuner)}</strong> · <span class="src">${escapeHtml(t.source)}</span></span>
        ${t.upvotes != null ? `<span class="upv">▲ ${t.upvotes} upvotes</span>` : `<span class="src">Curated, not vote-ranked</span>`}
      </div>
    </div>`;
}

function renderLiveCard(r){
  const codeRow = r.extractedCode
    ? `<div class="live-code-row">
        <span class="code-label">Possible code</span>
        <span class="code-value mono">${escapeHtml(r.extractedCode)}</span>
        <button type="button" class="copy-btn" data-code="${escapeHtml(r.extractedCode)}" onclick="copyCode(this)">Copy</button>
      </div>`
    : '';
  return `
    <div class="live-card">
      <a class="live-title" href="${escapeHtml(r.link)}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a>
      <p class="live-link">${escapeHtml(r.displayLink || r.link)}</p>
      <p class="live-snippet">${escapeHtml(r.snippet || '')}</p>
      ${codeRow}
    </div>`;
}

window.copyCode = function(btn){
  const code = btn.getAttribute('data-code');
  const text = code.replace(/\s+/g, '');
  const done = () => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1400);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
};

function fallbackCopy(text, cb){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
  if(cb) cb();
}

function renderFilterPills(){
  const pills = ['All', ...DISCIPLINE_NAMES];
  filterPillsEl.innerHTML = pills.map(name => {
    const count = name === 'All' ? SEED.tunes.length : DISCIPLINES[name].length;
    const isActive = (name === 'All' && !activeDiscipline) || name === activeDiscipline;
    return `<button type="button" class="filter-pill${isActive ? ' active' : ''}" data-discipline="${name === 'All' ? '' : escapeHtml(name)}">${escapeHtml(name)} (${count})</button>`;
  }).join('');
}

function showResultsForDiscipline(discipline){
  activeDiscipline = discipline;
  renderFilterPills();
  allCarsSection.style.display = 'none';
  searchInput.value = '';
  searchResultsEl.style.display = 'none';

  if(!discipline){
    resultsSection.style.display = 'none';
    resultsSection.innerHTML = '';
    return;
  }

  const tunes = DISCIPLINES[discipline] || [];
  resultsSection.style.display = 'block';
  if(!tunes.length){
    resultsSection.innerHTML = `
      <div class="results-heading"><h2>${escapeHtml(discipline)}</h2></div>
      <div class="not-found">No seeded tunes for this track type yet.</div>`;
    return;
  }
  const sorted = [...tunes].sort((a,b) => (b.upvotes ?? -1) - (a.upvotes ?? -1));
  resultsSection.innerHTML = `
    <div class="results-heading">
      <h2>${escapeHtml(discipline)}</h2>
      <span class="rh-sub">${tunes.length} seeded tune${tunes.length === 1 ? '' : 's'} across ${new Set(tunes.map(t => t.car)).size} car${new Set(tunes.map(t => t.car)).size === 1 ? '' : 's'}</span>
    </div>
    ${sorted.map(renderTuneCard).join('')}`;
}

async function runSearch(query){
  const mySeq = ++searchSeq;
  activeDiscipline = null;
  renderFilterPills();
  allCarsSection.style.display = 'none';
  resultsSection.style.display = 'block';

  resultsSection.innerHTML = `
    <div class="results-heading"><h2>${escapeHtml(query)}</h2></div>
    <div class="section-label"><span class="dot"></span>Seeded tunes</div>
    <div id="seededPane"></div>
    <div class="section-label"><span class="dot" style="background:var(--gold)"></span>Live search results</div>
    <div id="livePane"><div class="live-status"><span class="spinner"></span>Searching the web for “${escapeHtml(query)}” tune codes…</div></div>`;

  const seededPane = document.getElementById('seededPane');
  const livePane = document.getElementById('livePane');

  let data;
  try{
    const res = await fetch('/api/search?car=' + encodeURIComponent(query));
    data = await res.json();
  }catch(err){
    if(mySeq !== searchSeq) return;
    seededPane.innerHTML = `<div class="not-found">Couldn't reach the backend at <code>/api/search</code>. Is <code>python server/app.py</code> running?</div>`;
    livePane.innerHTML = '';
    return;
  }
  if(mySeq !== searchSeq) return; // a newer search superseded this one

  const seeded = data.seeded || [];
  if(!seeded.length){
    seededPane.innerHTML = `<div class="not-found">No seeded tunes for <b>${escapeHtml(query)}</b> in the hand-curated set (${CAR_NAMES.length} cars covered).</div>`;
  }else{
    const sorted = [...seeded].sort((a,b) => (b.upvotes ?? -1) - (a.upvotes ?? -1));
    seededPane.innerHTML = sorted.map(renderTuneCard).join('');
  }

  const live = data.live || {};
  if(!live.configured){
    livePane.innerHTML = `<div class="live-status error">⚠ ${escapeHtml(live.error || 'Live search is not configured.')}</div>`;
  }else if(live.error){
    livePane.innerHTML = `<div class="live-status error">⚠ ${escapeHtml(live.error)}<br><span class="mono" style="font-size:11.5px;">Query: ${escapeHtml(live.query || '')}</span></div>`;
  }else if(!live.results || !live.results.length){
    livePane.innerHTML = `<div class="live-status">No web results for this query yet.<br><span class="mono" style="font-size:11.5px;">Query: ${escapeHtml(live.query || '')}</span></div>`;
  }else{
    livePane.innerHTML = live.results.map(renderLiveCard).join('') +
      `<p class="tune-meta" style="margin-top:6px;">${live.cached ? 'Cached result — ' : ''}Live web search, not verified by Playground Games. Query: <code class="mono">${escapeHtml(live.query || '')}</code></p>`;
  }
}

function renderSearchResults(query){
  const matches = matchCars(query);
  if(!query.trim()){
    searchResultsEl.style.display = 'none';
    searchResultsEl.innerHTML = '';
    return;
  }
  searchResultsEl.style.display = 'block';
  if(!matches.length){
    searchResultsEl.innerHTML = `<div class="search-empty">No seeded cars match "${escapeHtml(query)}" — press Enter to search the web for it anyway.</div>`;
    return;
  }
  searchResultsEl.innerHTML = matches.map(name =>
    `<div class="search-result" data-car="${escapeHtml(name)}"><b>${escapeHtml(name)}</b><span class="sr-count">${CARS[name].length} tune${CARS[name].length === 1 ? '' : 's'}</span></div>`
  ).join('');
}

searchInput.addEventListener('input', (e) => {
  renderSearchResults(e.target.value);
});

searchInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter'){
    const val = searchInput.value.trim();
    if(!val) return;
    searchResultsEl.style.display = 'none';
    runSearch(val);
  }
});

searchResultsEl.addEventListener('click', (e) => {
  const row = e.target.closest('.search-result');
  if(!row) return;
  const car = row.getAttribute('data-car');
  searchInput.value = car;
  searchResultsEl.style.display = 'none';
  runSearch(car);
});

document.addEventListener('click', (e) => {
  if(!e.target.closest('.search-wrap')){
    searchResultsEl.style.display = 'none';
  }
});

filterPillsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-pill');
  if(!btn) return;
  const discipline = btn.getAttribute('data-discipline');
  showResultsForDiscipline(discipline || null);
  if(discipline) window.scrollTo({top: resultsSection.offsetTop - 20, behavior:'smooth'});
});

document.getElementById('browseAllBtn').addEventListener('click', () => {
  activeDiscipline = null;
  renderFilterPills();
  resultsSection.style.display = 'none';
  allCarsSection.style.display = 'block';
  allCarsSection.innerHTML = `
    <h3>All ${CAR_NAMES.length} seeded cars (${SEED.tunes.length} tunes total)</h3>
    <div class="all-cars-grid">
      ${CAR_NAMES.map(name => `<button type="button" data-car="${escapeHtml(name)}">${escapeHtml(name)} <span style="color:var(--neon)">(${CARS[name].length})</span></button>`).join('')}
    </div>`;
  allCarsSection.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const car = btn.getAttribute('data-car');
      searchInput.value = car;
      runSearch(car);
      window.scrollTo({top: resultsSection.offsetTop - 20, behavior:'smooth'});
    });
  });
});

loadSeed();
