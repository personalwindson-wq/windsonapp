// ════════════════════════════════════════════════════
// RapidAPI Service — ExerciseDB
// Responsável por: cache de GIFs, busca por parte do corpo e por nome.
// Depende de: EX_EN_MAP (src/data/exEnMap.js) carregado anteriormente.
//
// A chave RapidAPI NÃO fica mais no browser — as chamadas passam pelo
// proxy Netlify em /.netlify/functions/exercises
// ════════════════════════════════════════════════════

const _EXERCISE_PROXY = '/.netlify/functions/exercises';

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

  try {
    const res = await fetch(`${_EXERCISE_PROXY}?name=${encodeURIComponent(term)}`);
    if (!res.ok) return;
    const data = await res.json();
    const gif = Array.isArray(data) && data[0]?.gifUrl ? data[0].gifUrl : null;
    if (gif) {
      exSetCache(name, gif);
      const el2 = document.getElementById(elId);
      if (el2) el2.innerHTML = `<img src="${gif}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" loading="lazy"/>`;
    }
  } catch(e) { /* silent — offline ou proxy indisponível */ }
}

// ─── Exposição global ─────────────────────────────────────────────────────────
window.loadExGif  = loadExGif;
window.exGetCache = exGetCache; // usado por sendWorkoutToWhatsApp
