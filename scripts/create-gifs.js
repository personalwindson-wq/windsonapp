// scripts/create-gifs.js
// Cria GIFs animados (2 frames) de cada exercício e salva no Supabase Storage.
// Atualiza gif_url no banco com a URL pública permanente.
//
// Uso:
//   node scripts/create-gifs.js <SERVICE_ROLE_KEY>

const https   = require('https');
const http    = require('http');
const Jimp    = require('jimp');
const GifEncoder = require('gif-encoder-2');

const SUPABASE_URL  = 'https://hddlvnmpbbkvzbhqmsjo.supabase.co';
const STORAGE_BUCKET = 'exercise-gifs';
const SERVICE_KEY   = process.argv[2];
const GIF_SIZE      = 200; // px — bom balanço qualidade/tamanho
const FRAME_DELAY   = 900; // ms por frame
const BATCH         = 5;   // paralelo controlado

if (!SERVICE_KEY) {
  console.error('Uso: node scripts/create-gifs.js <SERVICE_ROLE_KEY>');
  process.exit(1);
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'WindsonPT/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} — ${url}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function sbGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(SUPABASE_URL).hostname,
      path,
      method: 'GET',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    }, res => {
      let raw = ''; res.on('data', c => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject); req.end();
  });
}

function sbPatch(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: new URL(SUPABASE_URL).hostname,
      path, method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
    }, res => { let raw=''; res.on('data',c=>raw+=c); res.on('end',()=>{ if(res.statusCode>=400) return reject(new Error(raw)); resolve(); }); });
    req.on('error', reject); req.write(data); req.end();
  });
}

function storageUpload(filename, gifBuffer) {
  return new Promise((resolve, reject) => {
    const path = `/storage/v1/object/${STORAGE_BUCKET}/${filename}`;
    const req = https.request({
      hostname: new URL(SUPABASE_URL).hostname,
      path, method: 'POST',
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': gifBuffer.length,
        'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
        'x-upsert': 'true',
      },
    }, res => { let raw=''; res.on('data',c=>raw+=c); res.on('end',()=>{ if(res.statusCode>=400) return reject(new Error(`Upload ${res.statusCode}: ${raw}`)); resolve(); }); });
    req.on('error', reject); req.write(gifBuffer); req.end();
  });
}

function createBucket() {
  return new Promise((resolve) => {
    const body = JSON.stringify({ id: STORAGE_BUCKET, name: STORAGE_BUCKET, public: true });
    const req = https.request({
      hostname: new URL(SUPABASE_URL).hostname,
      path: '/storage/v1/bucket', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    }, res => { let raw=''; res.on('data',c=>raw+=c); res.on('end',()=>resolve(res.statusCode)); });
    req.on('error', () => resolve(0)); req.write(body); req.end();
  });
}

// ─── GIF encoder ─────────────────────────────────────────────────────────────

async function makeGif(url0, url1) {
  const [buf0, buf1] = await Promise.all([downloadBuffer(url0), downloadBuffer(url1)]);
  const [img0, img1] = await Promise.all([Jimp.read(buf0), Jimp.read(buf1)]);

  img0.resize(GIF_SIZE, GIF_SIZE);
  img1.resize(GIF_SIZE, GIF_SIZE);

  return new Promise((resolve, reject) => {
    const encoder = new GifEncoder(GIF_SIZE, GIF_SIZE, 'neuquant', true);
    const chunks  = [];
    encoder.createReadStream().on('data', c => chunks.push(c)).on('end', () => resolve(Buffer.concat(chunks)));
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(FRAME_DELAY);
    encoder.setQuality(12);
    encoder.addFrame(img0.bitmap.data);
    encoder.addFrame(img1.bitmap.data);
    encoder.finish();
  });
}

function publicUrl(filename) {
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filename}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function processOne(ex, stats) {
  const filename = `${ex.id}.gif`;
  try {
    const gif = await makeGif(ex.gif_url, ex.image_url_2);
    await storageUpload(filename, gif);
    await sbPatch(`/rest/v1/exercises?id=eq.${ex.id}`, { gif_url: publicUrl(filename) });
    stats.ok++;
  } catch (e) {
    stats.fail++;
    // sem log pra não poluir o progresso
  }
}

async function run() {
  console.log('1. Criando bucket no Supabase Storage...');
  const st = await createBucket();
  console.log('   Status bucket:', st === 200 ? 'criado' : st === 409 ? 'já existe' : st);

  console.log('\n2. Buscando exercícios com 2 imagens...');
  const all = await sbGet(
    '/rest/v1/exercises?select=id,name,gif_url,image_url_2&limit=1000' +
    '&gif_url=not.is.null&image_url_2=not.is.null'
  );
  // Filtra os que ainda apontam pro GitHub (não foram convertidos)
  const pending = all.filter(e => e.gif_url && !e.gif_url.includes('supabase'));
  console.log(`   Total com 2 imagens: ${all.length} | Pendentes: ${pending.length}`);

  if (!pending.length) { console.log('Todos já convertidos!'); return; }

  console.log(`\n3. Gerando GIFs em batches de ${BATCH}...`);
  const stats = { ok: 0, fail: 0 };
  const total = pending.length;

  for (let i = 0; i < total; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    await Promise.all(batch.map(ex => processOne(ex, stats)));
    process.stdout.write(`\r   ${Math.min(i + BATCH, total)}/${total} — ✓${stats.ok} ✗${stats.fail}   `);
  }

  console.log(`\n\nConcluído!`);
  console.log(`  GIFs criados e salvos: ${stats.ok}`);
  console.log(`  Falhas (sem imagem):   ${stats.fail}`);
  console.log(`\n  URL base: ${publicUrl('{id}.gif')}`);
}

run().catch(err => { console.error('\nErro fatal:', err.message); process.exit(1); });
