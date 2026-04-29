// scripts/enrich-gifs.js
// Busca TODOS os GIFs do ExerciseDB (RapidAPI) e salva no Supabase.
//
// Uso:
//   node scripts/enrich-gifs.js <SERVICE_ROLE_KEY>
//
// A RAPIDAPI_KEY já está hardcoded abaixo (mesma do config.js).

const https = require('https');

const SUPABASE_URL  = 'https://hddlvnmpbbkvzbhqmsjo.supabase.co';
const RAPIDAPI_KEY  = '250ad1d8b7msh3c77027ec6db308p1af4c6jsna51edb18f18e';
const SERVICE_KEY   = process.argv[2];

if (!SERVICE_KEY) {
  console.error('Uso: node scripts/enrich-gifs.js <SERVICE_ROLE_KEY>');
  process.exit(1);
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function get(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: 'GET', headers }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode} — ${raw.slice(0, 200)}`));
        try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function patch(path, body, serviceKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: new URL(SUPABASE_URL).hostname,
      path,
      method:   'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(data),
        'apikey':         serviceKey,
        'Authorization':  `Bearer ${serviceKey}`,
        'Prefer':         'return=minimal',
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`PATCH ${res.statusCode} — ${raw.slice(0, 200)}`));
        resolve();
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sbGet(path) {
  return get(new URL(SUPABASE_URL).hostname, path, {
    'apikey':        SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  });
}

// ─── Busca todos exercícios do ExerciseDB (paginado) ─────────────────────────

async function fetchAllExerciseDB() {
  const all   = [];
  const limit = 500;
  let   offset = 0;

  while (true) {
    process.stdout.write(`\r  ExerciseDB: buscando offset ${offset}...    `);
    const batch = await get(
      'exercisedb.p.rapidapi.com',
      `/exercises?limit=${limit}&offset=${offset}`,
      { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com' }
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
    await new Promise(r => setTimeout(r, 300)); // respeita rate limit
  }

  console.log(`\n  ExerciseDB: ${all.length} exercícios encontrados`);
  return all;
}

// ─── Normalização para matching de nomes ─────────────────────────────────────

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildGifMap(exdbList) {
  const map = new Map();
  for (const ex of exdbList) {
    if (!ex.gifUrl) continue;
    map.set(normalize(ex.name), ex.gifUrl);
  }
  return map;
}

function findGif(dbName, gifMap) {
  const key = normalize(dbName);

  // 1. Exact match
  if (gifMap.has(key)) return gifMap.get(key);

  // 2. ExerciseDB name contains DB name (ou vice-versa)
  for (const [exKey, url] of gifMap) {
    if (exKey.includes(key) || key.includes(exKey)) return url;
  }

  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('1. Buscando exercícios do ExerciseDB...');
  const exdbList = await fetchAllExerciseDB();
  const gifMap   = buildGifMap(exdbList);
  console.log(`   GIF map: ${gifMap.size} entradas`);

  console.log('\n2. Buscando exercícios do Supabase...');
  const dbExercises = await sbGet('/rest/v1/exercises?select=id,name&limit=1000');
  console.log(`   Supabase: ${dbExercises.length} exercícios`);

  console.log('\n3. Cruzando e atualizando...');
  let matched = 0, skipped = 0;

  for (let i = 0; i < dbExercises.length; i++) {
    const ex  = dbExercises[i];
    const gif = findGif(ex.name, gifMap);

    process.stdout.write(`\r   ${i + 1}/${dbExercises.length} — matched: ${matched} skipped: ${skipped}   `);

    if (!gif) { skipped++; continue; }

    await patch(`/rest/v1/exercises?id=eq.${ex.id}`, { gif_url: gif }, SERVICE_KEY);
    matched++;
  }

  console.log(`\n\nConcluído!`);
  console.log(`  Atualizados com GIF: ${matched}`);
  console.log(`  Sem correspondência: ${skipped}`);
}

run().catch(err => {
  console.error('\nErro:', err.message);
  process.exit(1);
});
