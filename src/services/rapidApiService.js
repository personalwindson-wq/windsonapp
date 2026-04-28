// ════════════════════════════════════════════════════
// RapidAPI Service — ExerciseDB
// Responsável por: cache de GIFs, busca por parte do corpo e por nome.
// Depende de: EX_EN_MAP (src/data/exEnMap.js) carregado anteriormente.
// ════════════════════════════════════════════════════

const RAPIDAPI_KEY = (window.APP_CONFIG || {}).RAPIDAPI_KEY || '';

// ─── Utilitários internos ────────────────────────────────────────────────────

function exGetTerm(ptName) {
  for (const [pt, en] of Object.entries(EX_EN_MAP)) {
    if (ptName.toLowerCase().includes(pt.toLowerCase())) return en;
  }
  return null;
}

function exGetCache(name) {
  try {
    const c = JSON.parse(localStorage.getItem('wpt_gifs') || '{}');
    const e = c[name];
    return (e && Date.now() - e.ts < 604800000) ? e.url : null; // 7 dias
  } catch(e) { return null; }
}

function exSetCache(name, url) {
  try {
    const c = JSON.parse(localStorage.getItem('wpt_gifs') || '{}');
    c[name] = { url, ts: Date.now() };
    localStorage.setItem('wpt_gifs', JSON.stringify(c));
  } catch(e) {}
}

// ─── API Calls ───────────────────────────────────────────────────────────────

async function loadExGif(name, elId) {
  const el = document.getElementById(elId);
  if (!el) return;

  const cached = exGetCache(name);
  if (cached) {
    el.innerHTML = `<img src="${cached}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" loading="lazy"/>`;
    return;
  }

  const term = exGetTerm(name);
  if (!term) return;
  if (!RAPIDAPI_KEY || RAPIDAPI_KEY.includes('SUA_')) return;

  try {
    const res = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(term)}?limit=3&offset=0`,
      { headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com' } }
    );
    const data = await res.json();
    const gif = Array.isArray(data) && data[0]?.gifUrl ? data[0].gifUrl : null;
    if (gif) {
      exSetCache(name, gif);
      const el2 = document.getElementById(elId);
      if (el2) el2.innerHTML = `<img src="${gif}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" loading="lazy"/>`;
    }
  } catch(e) { /* silent — sem chave ou offline */ }
}

// ─── Exposição global ─────────────────────────────────────────────────────────
window.loadExGif  = loadExGif;
window.exGetCache = exGetCache; // usado por sendWorkoutToWhatsApp
