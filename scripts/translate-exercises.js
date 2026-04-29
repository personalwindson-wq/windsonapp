// scripts/translate-exercises.js
// Traduz todos os nomes de exercícios para português (MyMemory API — grátis).
// Salva na coluna name_pt do Supabase.
//
// Uso:
//   node scripts/translate-exercises.js <SERVICE_ROLE_KEY>

const https = require('https');

const SUPABASE_URL = 'https://hddlvnmpbbkvzbhqmsjo.supabase.co';
const SERVICE_KEY  = process.argv[2];

if (!SERVICE_KEY) {
  console.error('Uso: node scripts/translate-exercises.js <SERVICE_ROLE_KEY>');
  process.exit(1);
}

function sbGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(SUPABASE_URL).hostname,
      path,
      method: 'GET',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.end();
  });
}

function sbPatch(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: new URL(SUPABASE_URL).hostname,
      path,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`PATCH ${res.statusCode}: ${raw}`));
        resolve();
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function translate(text) {
  return new Promise((resolve) => {
    const q = encodeURIComponent(text);
    const req = https.request({
      hostname: 'api.mymemory.translated.net',
      path: `/get?q=${q}&langpair=en|pt-BR`,
      method: 'GET',
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const d = JSON.parse(raw);
          const translated = d?.responseData?.translatedText;
          // MyMemory às vezes retorna em maiúsculas — normaliza
          resolve(translated && translated !== text.toUpperCase() ? translated : null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  // 1. Adiciona coluna name_pt se não existir (ignorar erro se já existir)
  console.log('1. Buscando exercícios do Supabase...');
  const exercises = await sbGet('/rest/v1/exercises?select=id,name,name_pt&limit=1000&order=id.asc');
  const pending   = exercises.filter(e => !e.name_pt);
  console.log(`   Total: ${exercises.length} | Sem tradução: ${pending.length}`);

  if (pending.length === 0) {
    console.log('Todos já traduzidos!');
    return;
  }

  console.log('\n2. Traduzindo com MyMemory API...');
  let ok = 0, fail = 0;

  for (let i = 0; i < pending.length; i++) {
    const ex = pending[i];
    process.stdout.write(`\r   ${i + 1}/${pending.length} — ok:${ok} falha:${fail}   `);

    const pt = await translate(ex.name);
    if (pt) {
      await sbPatch(`/rest/v1/exercises?id=eq.${ex.id}`, { name_pt: pt });
      ok++;
    } else {
      fail++;
    }

    // MyMemory: ~1 req/s no free tier
    await sleep(1100);
  }

  console.log(`\n\nConcluído!`);
  console.log(`  Traduzidos: ${ok}`);
  console.log(`  Sem tradução (mantém inglês): ${fail}`);
}

run().catch(err => {
  console.error('\nErro:', err.message);
  process.exit(1);
});
