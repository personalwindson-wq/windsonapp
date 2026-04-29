// scripts/seed-exercises.js
// Lê os exercícios extraídos do repo wrkout/exercises.json e gera:
//   1. migration.sql  — ALTER TABLE para adicionar colunas novas
//   2. seed_exercises.sql — TRUNCATE + INSERT com todos os 873 exercícios
//
// Uso:
//   node scripts/seed-exercises.js
//
// Depois cole os dois arquivos .sql no Supabase SQL Editor (nessa ordem).

const fs   = require('fs');
const path = require('path');

const EXERCISES_DIR = path.join(
  process.env.LOCALAPPDATA || process.env.APPDATA || process.env.HOME,
  'Temp', 'exercises_out',
  'exercises.json-master', 'exercises'
);

const BASE_IMG_URL =
  'https://raw.githubusercontent.com/wrkout/exercises.json/master/exercises';

const OUT_DIR = path.join(__dirname, '..', 'scripts');

function escape(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

function dirToExercise(dirName) {
  const jsonPath = path.join(EXERCISES_DIR, dirName, 'exercise.json');
  if (!fs.existsSync(jsonPath)) return null;

  const ex = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const primaryMuscles = (ex.primaryMuscles || []).join(', ');
  const secondaryMuscles = (ex.secondaryMuscles || []).join(', ');
  const instructions = JSON.stringify(ex.instructions || []).replace(/'/g, "''");

  const imgDir = path.join(EXERCISES_DIR, dirName, 'images');
  const images = fs.existsSync(imgDir)
    ? fs.readdirSync(imgDir).filter(f => /\.(jpg|jpeg|gif|png)$/i.test(f)).sort()
    : [];

  const img0 = images[0] ? `${BASE_IMG_URL}/${dirName}/images/${images[0]}` : '';
  const img1 = images[1] ? `${BASE_IMG_URL}/${dirName}/images/${images[1]}` : '';

  return {
    name:              escape(ex.name || ''),
    target_muscle:     escape(primaryMuscles),
    secondary_muscles: escape(secondaryMuscles),
    equipment:         escape(ex.equipment || ''),
    level:             escape(ex.level || ''),
    force_type:        escape(ex.force || ''),
    mechanic:          escape(ex.mechanic || ''),
    category:          escape(ex.category || ''),
    instructions,
    gif_url:           img0,
    image_url_2:       img1,
  };
}

function buildMigrationSQL() {
  return `-- ─── Migração: adiciona colunas ao exercises ──────────────
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS secondary_muscles TEXT,
  ADD COLUMN IF NOT EXISTS level             TEXT,
  ADD COLUMN IF NOT EXISTS force_type        TEXT,
  ADD COLUMN IF NOT EXISTS mechanic          TEXT,
  ADD COLUMN IF NOT EXISTS category          TEXT,
  ADD COLUMN IF NOT EXISTS instructions      JSONB,
  ADD COLUMN IF NOT EXISTS image_url_2       TEXT;
`;
}

function buildSeedSQL(exercises) {
  const rows = exercises
    .filter(Boolean)
    .map(ex => `  ('${ex.name}', '${ex.target_muscle}', '${ex.secondary_muscles}', '${ex.equipment}', '${ex.level}', '${ex.force_type}', '${ex.mechanic}', '${ex.category}', '${ex.gif_url}', '${ex.image_url_2}', '${ex.instructions}'::jsonb)`)
    .join(',\n');

  return `-- ─── Seed: 873 exercícios do wrkout/exercises.json ───────
-- ATENÇÃO: isso apaga todos os exercícios existentes e reinserem.
TRUNCATE TABLE exercises RESTART IDENTITY CASCADE;

INSERT INTO exercises
  (name, target_muscle, secondary_muscles, equipment, level, force_type, mechanic, category, gif_url, image_url_2, instructions)
VALUES
${rows};
`;
}

// ── Main ──────────────────────────────────────────────────
if (!fs.existsSync(EXERCISES_DIR)) {
  console.error('Diretório não encontrado:', EXERCISES_DIR);
  console.error('Extraia o ZIP do repo em:  %APPDATA%\\Local\\Temp\\exercises_out\\');
  process.exit(1);
}

const dirs      = fs.readdirSync(EXERCISES_DIR).filter(d =>
  fs.statSync(path.join(EXERCISES_DIR, d)).isDirectory()
);

console.log(`Processando ${dirs.length} exercícios...`);
const exercises = dirs.map(dirToExercise);
const valid     = exercises.filter(Boolean);
console.log(`Válidos: ${valid.length}`);

const migSQL  = buildMigrationSQL();
const seedSQL = buildSeedSQL(valid);

fs.writeFileSync(path.join(OUT_DIR, 'migration.sql'), migSQL);
fs.writeFileSync(path.join(OUT_DIR, 'seed_exercises.sql'), seedSQL);

console.log('\nArquivos gerados:');
console.log('  scripts/migration.sql');
console.log('  scripts/seed_exercises.sql');
console.log('\nPróximos passos:');
console.log('  1. Abra o Supabase SQL Editor');
console.log('  2. Cole e execute migration.sql primeiro');
console.log('  3. Cole e execute seed_exercises.sql depois');
