// scripts/translate-instructions.js
// Traduz as instruções dos exercícios para português usando MyMemory API (gratuita).
// Agrupa todos os passos de cada exercício em 1 requisição para economizar quota.
// Suporte a resumo: exercícios já traduzidos são pulados.
//
// PRÉ-REQUISITO — rode uma vez no Supabase SQL Editor:
//   ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_pt JSONB;
//
// Uso:
//   node scripts/translate-instructions.js <SERVICE_ROLE_KEY>
//
// Limite do MyMemory grátis: ~5 000 palavras/dia.
// Se o limite for atingido, o script para e salva o progresso.
// Rode novamente no dia seguinte — os já traduzidos são pulados.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUPABASE_URL = 'https://hddlvnmpbbkvzbhqmsjo.supabase.co';
const SERVICE_KEY  = process.argv[2];
const STEP_SEP     = ' ||| ';      // separador que a API preserva na tradução
const PROGRESS_FILE = path.join(__dirname, '.translate-instructions-progress.json');

if (!SERVICE_KEY) {
  console.error('Uso: node scripts/translate-instructions.js <SERVICE_ROLE_KEY>');
  process.exit(1);
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function sbGet(p) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(SUPABASE_URL).hostname,
      path: p,
      method: 'GET',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.end();
  });
}

function sbPatch(p, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: new URL(SUPABASE_URL).hostname,
      path: p,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'return=minimal',
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

// Traduz um bloco de texto (todos os passos concatenados com STEP_SEP)
function translateBlock(text) {
  return new Promise(resolve => {
    const q = encodeURIComponent(text.slice(0, 4000)); // limite de URL seguro
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
          // Detecta limite de quota excedido
          if (d?.responseStatus === 429 || d?.responseData?.translatedText?.includes('MYMEMORY WARNING')) {
            resolve({ limited: true });
            return;
          }
          const t = d?.responseData?.translatedText;
          resolve({ text: t && t !== text.toUpperCase() ? t : null });
        } catch { resolve({ text: null }); }
      });
    });
    req.on('error', () => resolve({ text: null }));
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Progresso persistido ─────────────────────────────────────────────────────

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); }
  catch { return { done: [] }; }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p), 'utf8');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('1. Buscando exercícios com instruções...');
  const all = await sbGet(
    '/rest/v1/exercises?select=id,instructions,instructions_pt&limit=1000&order=id.asc'
  );

  if (!Array.isArray(all)) {
    console.error('Erro ao buscar exercícios. Verifique se a coluna instructions_pt existe:');
    console.error('  ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions_pt JSONB;');
    console.error('Resposta:', JSON.stringify(all));
    process.exit(1);
  }

  const pending = all.filter(e =>
    Array.isArray(e.instructions) && e.instructions.length > 0 && !e.instructions_pt
  );

  console.log(`   Total: ${all.length} | Com instruções: ${all.filter(e => Array.isArray(e.instructions) && e.instructions.length > 0).length} | Pendentes: ${pending.length}`);

  if (pending.length === 0) {
    console.log('\nTodas as instruções já estão traduzidas!');
    if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
    return;
  }

  const progress = loadProgress();
  const remaining = pending.filter(e => !progress.done.includes(e.id));
  console.log(`   Restantes (excluindo sessões anteriores): ${remaining.length}`);

  console.log('\n2. Traduzindo instruções (1 req/exercício)...');
  let ok = 0, fail = 0, limited = false;

  for (let i = 0; i < remaining.length; i++) {
    const ex = remaining[i];
    const steps = ex.instructions;
    process.stdout.write(`\r   ${i + 1}/${remaining.length} (id=${ex.id}) — ok:${ok} falha:${fail}   `);

    // Junta os passos em um bloco; preserva a ordem com separador
    const block = steps.join(STEP_SEP);
    const result = await translateBlock(block);

    if (result.limited) {
      console.log('\n\n⚠️  Limite diário do MyMemory atingido.');
      saveProgress(progress);
      limited = true;
      break;
    }

    if (result.text) {
      // Divide de volta nos passos traduzidos
      const ptSteps = result.text
        .split(STEP_SEP)
        .map(s => s.trim())
        .filter(Boolean);

      // Aceita se o número de passos bateu (tolerância ±1 para separadores colados)
      if (Math.abs(ptSteps.length - steps.length) <= 1) {
        await sbPatch(`/rest/v1/exercises?id=eq.${ex.id}`, { instructions_pt: ptSteps });
        progress.done.push(ex.id);
        ok++;
      } else {
        // Fallback: traduz passo a passo
        const translatedSteps = [];
        for (const step of steps) {
          const r2 = await translateBlock(step);
          if (r2.limited) { limited = true; break; }
          translatedSteps.push(r2.text || step);
          await sleep(1100);
        }
        if (limited) { saveProgress(progress); break; }
        await sbPatch(`/rest/v1/exercises?id=eq.${ex.id}`, { instructions_pt: translatedSteps });
        progress.done.push(ex.id);
        ok++;
      }
    } else {
      fail++;
    }

    saveProgress(progress);
    await sleep(1100); // MyMemory: ~1 req/s no free tier
  }

  console.log('\n');
  console.log(`Concluído!`);
  console.log(`  Traduzidos: ${ok}`);
  console.log(`  Falha/sem tradução: ${fail}`);
  if (limited) {
    console.log(`  Limite diário atingido. Rode novamente amanhã para continuar.`);
    console.log(`  Progresso salvo em: ${PROGRESS_FILE}`);
  } else {
    if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
    console.log(`  Tudo traduzido!`);
  }
}

run().catch(err => {
  console.error('\nErro:', err.message);
  process.exit(1);
});
