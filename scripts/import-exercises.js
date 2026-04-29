// scripts/import-exercises.js
// Importa os 873 exercícios direto no Supabase via service_role key.
//
// Uso:
//   node scripts/import-exercises.js <SERVICE_ROLE_KEY>
//
// A service_role key está em:
//   Supabase Dashboard → Project Settings → API → service_role (secret)

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUPABASE_URL = 'https://hddlvnmpbbkvzbhqmsjo.supabase.co';
const SERVICE_KEY  = process.argv[2];

if (!SERVICE_KEY) {
  console.error('Uso: node scripts/import-exercises.js <SERVICE_ROLE_KEY>');
  console.error('Pegue a key em: Supabase Dashboard → Settings → API → service_role');
  process.exit(1);
}

const EXERCISES_DIR = path.join(
  process.env.LOCALAPPDATA || process.env.APPDATA,
  'Temp', 'exercises_out', 'exercises.json-master', 'exercises'
);

const BASE_IMG = 'https://raw.githubusercontent.com/wrkout/exercises.json/master/exercises';

function readExercises() {
  const dirs = fs.readdirSync(EXERCISES_DIR).filter(d =>
    fs.statSync(path.join(EXERCISES_DIR, d)).isDirectory()
  );

  return dirs.map(dir => {
    const jsonPath = path.join(EXERCISES_DIR, dir, 'exercise.json');
    if (!fs.existsSync(jsonPath)) return null;
    const ex = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    const imgDir = path.join(EXERCISES_DIR, dir, 'images');
    const images = fs.existsSync(imgDir)
      ? fs.readdirSync(imgDir).filter(f => /\.(jpg|jpeg|gif|png)$/i.test(f)).sort()
      : [];

    return {
      name:              ex.name || '',
      target_muscle:     (ex.primaryMuscles || []).join(', '),
      secondary_muscles: (ex.secondaryMuscles || []).join(', '),
      equipment:         ex.equipment || '',
      level:             ex.level     || '',
      force_type:        ex.force     || '',
      mechanic:          ex.mechanic  || '',
      category:          ex.category  || '',
      gif_url:           images[0] ? `${BASE_IMG}/${dir}/images/${images[0]}` : '',
      image_url_2:       images[1] ? `${BASE_IMG}/${dir}/images/${images[1]}` : '',
      instructions:      ex.instructions || [],
    };
  }).filter(Boolean);
}

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url  = new URL(SUPABASE_URL);
    const opts = {
      hostname: url.hostname,
      path,
      method,
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer':        'return=minimal',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
        } else {
          resolve(raw ? JSON.parse(raw) : null);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Lendo exercícios...');
  const exercises = readExercises();
  console.log(`Total: ${exercises.length} exercícios`);

  // Limpa tabela antes de inserir
  console.log('Limpando tabela exercises...');
  await supabaseRequest('DELETE', '/rest/v1/exercises?id=gt.0', null);

  const BATCH = 50;
  const total = Math.ceil(exercises.length / BATCH);

  for (let i = 0; i < exercises.length; i += BATCH) {
    const batch = exercises.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    process.stdout.write(`\rInserindo batch ${batchNum}/${total}...`);
    await supabaseRequest('POST', '/rest/v1/exercises', batch);
  }

  console.log(`\nConcluído! ${exercises.length} exercícios importados.`);
}

run().catch(err => {
  console.error('\nErro:', err.message);
  process.exit(1);
});
