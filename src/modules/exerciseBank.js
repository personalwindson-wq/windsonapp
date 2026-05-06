// ════════════════════════════════════════════════════
// Exercise Bank Module
//
// Catálogo de exercícios servido pela tabela Supabase `exercises`.
// Padrão Singleton: os dados são carregados uma vez e filtrados localmente
// — zero queries repetitivas ao banco.
//
// Dependências:
//   window.sbClient  → supabase_config.js
//   window.exGetCache → src/services/rapidApiService.js (usado em sendWorkoutToWhatsApp)
// ════════════════════════════════════════════════════

const sbClient = window.sbClient;

// ─── Cache Singleton ─────────────────────────────────────────────────────────
let _exercises    = [];       // populado uma única vez por fetchExercises()
let _currentMuscle = 'chest';
let _searchTimer;

// ─── Core: Supabase fetch ─────────────────────────────────────────────────────

async function fetchExercises() {
  if (_exercises.length > 0) return _exercises; // cache hit — retorno imediato

  const { data, error } = await sbClient
    .from('exercises')
    .select('id, name, name_pt, target_muscle, secondary_muscles, equipment, level, force_type, mechanic, category, gif_url, image_url_2, instructions, instructions_pt')
    .order('name', { ascending: true });

  if (error) throw error;
  _exercises = data || [];
  return _exercises;
}

// ─── Filtros (operam sobre o cache local — O(n), sem I/O) ─────────────────────

function getExercisesByMuscle(muscle) {
  if (!muscle) return _exercises;
  return _exercises.filter(ex =>
    ex.target_muscle?.toLowerCase().includes(muscle.toLowerCase())
  );
}

function searchExercises(query) {
  const q = query.toLowerCase().trim();
  if (!q) return _exercises;
  return _exercises.filter(ex =>
    ex.name_pt?.toLowerCase().includes(q)       ||
    ex.name?.toLowerCase().includes(q)          ||
    ex.target_muscle?.toLowerCase().includes(q) ||
    ex.equipment?.toLowerCase().includes(q)
  );
}

// ─── UI: card individual ──────────────────────────────────────────────────────
// Aplica aspect-ratio 1/1 para evitar layout shift enquanto o GIF carrega.

const _LEVEL_BADGE = {
  beginner:     { label: 'Iniciante',     color: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.3)'  },
  intermediate: { label: 'Intermediário', color: '#D4AF37', bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.3)' },
  advanced:     { label: 'Avançado',      color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
  expert:       { label: 'Expert',        color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.3)' },
};

// Mapas de tradução EN → PT para grupos musculares e equipamentos
const _MUSCLE_PT = {
  'chest': 'Peitoral', 'back': 'Dorsal', 'upper back': 'Dorsal Superior',
  'middle back': 'Dorsal Médio', 'lower back': 'Lombar', 'lats': 'Latíssimo',
  'shoulders': 'Ombros', 'delts': 'Deltóides', 'deltoids': 'Deltóides',
  'biceps': 'Bíceps', 'triceps': 'Tríceps', 'forearms': 'Antebraços',
  'upper arms': 'Braços', 'abs': 'Abdômen', 'core': 'Core',
  'upper legs': 'Pernas', 'quads': 'Quadríceps', 'quadriceps': 'Quadríceps',
  'hamstrings': 'Isquiotibiais', 'glutes': 'Glúteos', 'lower legs': 'Panturrilha',
  'calves': 'Panturrilha', 'neck': 'Pescoço', 'waist': 'Cintura',
  'full body': 'Corpo Completo', 'cardiovascular system': 'Cardiovascular',
  'serratus anterior': 'Serrátil Anterior', 'adductors': 'Adutores',
  'abductors': 'Abdutores', 'pectorals': 'Peitoral', 'trapezius': 'Trapézio',
  'hip flexors': 'Flexores do Quadril', 'spine': 'Coluna',
};

const _EQUIP_PT = {
  'barbell': 'Barra', 'dumbbell': 'Haltere', 'dumbbells': 'Halteres',
  'cable': 'Polia', 'machine': 'Máquina', 'body weight': 'Peso Corporal',
  'bodyweight': 'Peso Corporal', 'kettlebell': 'Kettlebell', 'band': 'Elástico',
  'resistance band': 'Elástico', 'medicine ball': 'Bola Medicinal',
  'stability ball': 'Bola de Estabilidade', 'ez barbell': 'Barra EZ',
  'ez bar': 'Barra EZ', 'smith machine': 'Smith Machine',
  'leverage machine': 'Máquina', 'rope': 'Corda', 'roller': 'Foam Roller',
  'bosu ball': 'Bosu Ball', 'suspension': 'Suspensão (TRX)', 'trap bar': 'Trap Bar',
  'sled': 'Trenó', 'bench': 'Banco', 'assisted': 'Assistido',
  'weighted': 'Com Peso', 'olympic barbell': 'Barra Olímpica', 'hammer': 'Martelo',
};

// Título sem o bug \b\w que capitaliza letras após acentos (ex: "BraçO")
function _titleCase(s) {
  if (!s) return '—';
  return s.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w).join(' ');
}

function _translateMuscle(s) {
  if (!s) return '—';
  const key = s.toLowerCase().trim();
  return _MUSCLE_PT[key] || _titleCase(s);
}

function _translateEquip(s) {
  if (!s) return '—';
  const key = s.toLowerCase().trim();
  return _EQUIP_PT[key] || _titleCase(s);
}

function renderExerciseCard(ex) {
  const name      = ex.name_pt ? _titleCase(ex.name_pt) : _titleCase(ex.name);
  const muscle    = _translateMuscle(ex.target_muscle);
  const equipment = _translateEquip(ex.equipment);
  const safeName  = name.replace(/'/g, "\\'");
  const img0      = ex.gif_url     || '';
  const img1      = ex.image_url_2 || '';
  const lvl       = _LEVEL_BADGE[ex.level] || null;
  const steps     = Array.isArray(ex.instructions_pt) && ex.instructions_pt.length
                      ? ex.instructions_pt
                      : Array.isArray(ex.instructions) ? ex.instructions : [];
  const cardId    = 'ex-' + Math.random().toString(36).slice(2, 8);

  const imgSection = (img0 && img1)
    ? `<div class="ex-img-wrap">
        <img src="${img0}" alt="${name} início" class="fr-a" loading="lazy" onerror="this.style.display='none'"/>
        <img src="${img1}" alt="${name} fim"    class="fr-b" loading="lazy" onerror="this.style.display='none'"/>
      </div>`
    : img0
      ? `<div class="ex-img-wrap"><img src="${img0}" alt="${name}" class="solo" loading="lazy" onerror="this.style.display='none'"/></div>`
      : `<div class="ex-img-wrap flex items-center justify-center">
           <span class="material-symbols-outlined text-4xl" style="color:#333;position:relative;">fitness_center</span>
         </div>`;

  const levelBadge = lvl
    ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
             style="background:${lvl.bg};color:${lvl.color};border:1px solid ${lvl.border};">${lvl.label}</span>`
    : '';

  const instructionsBlock = steps.length
    ? `<div id="${cardId}-inst" style="display:none;" class="mt-1 flex flex-col gap-2">
        ${steps.map((s, i) => `
          <div class="flex gap-2 text-[11px]" style="color:#aaa;">
            <span class="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                  style="background:rgba(212,175,55,0.15);color:#D4AF37;">${i + 1}</span>
            <p>${s}</p>
          </div>`).join('')}
      </div>
      <button onclick="(function(el,btn){const open=el.style.display==='none';el.style.display=open?'block':'none';btn.textContent=open?'Ocultar instruções':'Ver instruções';})(document.getElementById('${cardId}-inst'),this)"
              class="mt-1 text-[10px] font-medium"
              style="color:rgba(212,175,55,0.7);text-align:left;">Ver instruções</button>`
    : '';

  return `
  <div class="exercise-card flex flex-col rounded-2xl overflow-hidden transition-all duration-300"
       style="background:#0c1414;border:1px solid rgba(212,175,55,0.12);"
       onmouseenter="this.style.borderColor='rgba(212,175,55,0.35)'"
       onmouseleave="this.style.borderColor='rgba(212,175,55,0.12)'">

    ${imgSection}

    <div class="flex flex-col gap-2 p-4 flex-grow">
      <h3 class="font-headline font-bold text-sm text-on-surface leading-tight">${name}</h3>
      <div class="flex gap-1.5 flex-wrap">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style="background:rgba(212,175,55,0.12);color:#D4AF37;border:1px solid rgba(212,175,55,0.25);">${muscle}</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide"
              style="background:rgba(255,255,255,0.05);color:#777;border:1px solid rgba(255,255,255,0.07);">${equipment}</span>
        ${levelBadge}
      </div>
      ${instructionsBlock}
      <button onclick="exBankAddToWorkout('${safeName}')"
              class="mt-auto w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
              style="background:rgba(212,175,55,0.1);color:#D4AF37;border:1px solid rgba(212,175,55,0.25);">
        Incluir no Protocolo
      </button>
    </div>
  </div>`;
}

// ─── UI: lista completa ───────────────────────────────────────────────────────

function exBankRender(exercises) {
  const list = document.getElementById('ex-bank-list');
  if (!list) return;
  if (!exercises || !exercises.length) {
    const searchVal = document.getElementById('ex-search-input')?.value?.trim();
    list.innerHTML = searchVal
      ? `<div class="flex flex-col items-center gap-3 py-10 px-4 text-center">
           <span class="material-symbols-outlined text-3xl" style="color:#333;">search_off</span>
           <p class="text-xs" style="color:#666;">Nenhum resultado para "<strong style="color:#888;">${searchVal}</strong>"</p>
           <button onclick="document.getElementById('ex-search-input').value='';exBankSearchDebounce('')" class="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5" style="color:#9B7B0E;border:1px solid rgba(212,175,55,0.2);">Limpar busca</button>
         </div>`
      : `<div class="flex flex-col items-center gap-3 py-10 px-4 text-center">
           <span class="material-symbols-outlined text-3xl" style="color:#333;">fitness_center</span>
           <p class="text-xs" style="color:#666;">Nenhum exercício neste grupo muscular.</p>
         </div>`;
    return;
  }
  list.innerHTML = `<div class="grid grid-cols-2 gap-3">${exercises.map(renderExerciseCard).join('')}</div>`;
}

function _exBankSpinner(msg) {
  const list = document.getElementById('ex-bank-list');
  if (list) list.innerHTML =
    '<div class="flex flex-col items-center justify-center gap-3 py-10">'
    + '<div class="w-8 h-8 rounded-full border-2 animate-spin" style="border-color:rgba(212,175,55,0.3);border-top-color:#D4AF37;"></div>'
    + `<p class="text-xs" style="color:#666;">${msg}</p></div>`;
}

// ─── Controladores de UI ──────────────────────────────────────────────────────

async function exBankFilter(muscle, label, btn) {
  _currentMuscle = muscle;
  document.querySelectorAll('.ex-filter-btn').forEach(b => b.classList.remove('ex-filter-active'));
  if (btn) btn.classList.add('ex-filter-active');
  const si = document.getElementById('ex-search-input');
  if (si) si.value = '';

  _exBankSpinner('Carregando exercícios...');
  try {
    await fetchExercises();
    exBankRender(getExercisesByMuscle(muscle));
  } catch (e) {
    const list = document.getElementById('ex-bank-list');
    if (list) list.innerHTML =
      '<p class="text-xs text-center py-8 text-error px-4">Erro ao carregar exercícios.'
      + '<br><span class="font-mono text-xs" style="color:#555;">' + e.message + '</span></p>';
  }
}

function exBankSearchDebounce(val) {
  clearTimeout(_searchTimer);
  if (!val.trim()) { exBankRender(getExercisesByMuscle(_currentMuscle)); return; }
  _searchTimer = setTimeout(() => exBankRender(searchExercises(val.trim())), 300);
}

// ─── PiP Preview ─────────────────────────────────────────────────────────────

function showPiP(url) {
  const pip = document.getElementById('pip-preview');
  const img = document.getElementById('pip-img');
  if (pip && img && url) { img.src = url; pip.classList.add('active'); }
}

function hidePiP() {
  const pip = document.getElementById('pip-preview');
  if (pip) pip.classList.remove('active');
}

// ─── Workout Builder ─────────────────────────────────────────────────────────

function exBankAddToWorkout(name) {
  const list = document.getElementById('workout-builder-list');
  if (list) {
    const num = list.querySelectorAll('.workout-item').length + 1;
    const item = document.createElement('div');
    item.className = 'glass-panel rounded-xl p-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center relative group workout-item';
    item.dataset.name = name;
    item.innerHTML = `
      <div class="flex items-center gap-4 w-full lg:w-1/3">
        <div class="w-8 h-8 rounded bg-surface-container flex items-center justify-center font-headline font-bold text-primary shrink-0 border border-primary/20">${num}</div>
        <div class="flex-1">
          <h4 class="font-body text-base font-semibold text-on-surface">${name}</h4>
          <p class="font-label text-xs text-on-surface-variant">Exercício Adicionado</p>
        </div>
        <button onclick="this.closest('.workout-item').remove()" class="w-8 h-8 flex items-center justify-center rounded-full bg-error/10 text-error lg:hidden">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
      <div class="grid grid-cols-4 gap-3 w-full lg:w-2/3 relative">
        ${['Séries','Reps','Carga','Pausa'].map((label, i) => `
          <div class="flex flex-col gap-1">
            <label class="font-label text-[10px] uppercase tracking-wider text-outline-variant">${label}</label>
            <input class="w-full bg-surface-container border-b-2 border-transparent focus:border-primary rounded-t-md px-3 py-2 text-sm text-on-surface text-center font-medium outline-none h-10"
                   type="text" value="${['3','10-12','-','60s'][i]}"/>
          </div>`).join('')}
        <button onclick="this.closest('.workout-item').remove()"
                class="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-error/10 text-error opacity-0 group-hover:opacity-100 transition-opacity">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>`;

    const dropZone = list.querySelector('.border-dashed');
    list.insertBefore(item, dropZone || null);
  }

  const toast = document.createElement('div');
  toast.textContent = name + ' adicionado ao treino';
  Object.assign(toast.style, {
    position:'fixed', bottom:'90px', left:'50%', transform:'translateX(-50%)',
    background:'rgba(212,175,55,0.92)', color:'#080808', padding:'8px 16px',
    borderRadius:'12px', fontSize:'12px', fontWeight:'600',
    whiteSpace:'nowrap', zIndex:'400', pointerEvents:'none',
    boxShadow:'0 4px 20px rgba(212,175,55,0.4)'
  });
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 1700);
  setTimeout(() => toast.remove(), 2000);
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

function sendWorkoutToWhatsApp() {
  const phone = prompt('Digite o número do WhatsApp do cliente com DDD (Ex: 11999999999):');
  if (!phone) return;

  let text = '*Fala! Seu treino está na mão.* 💪\n';
  text += '_Prescrição com foco em biomecânica e controle de carga:_\n\n';

  const items = document.querySelectorAll('#workout-builder-list .workout-item');
  if (!items.length) { alert('Adicione exercícios ao treino primeiro.'); return; }

  items.forEach((item, idx) => {
    const name   = item.querySelector('h4')?.textContent || '';
    const inputs = item.querySelectorAll('input');
    if (inputs.length >= 4) {
      text += `*${idx + 1}. ${name}*\n`;
      text += `⏱️ Séries: ${inputs[0].value} | Reps: ${inputs[1].value} | Carga: ${inputs[2].value}kg | Descanso: ${inputs[3].value}\n`;
      const gifUrl = window.exGetCache?.(name);
      if (gifUrl) text += `🎥 Demonstração: ${gifUrl}\n`;
      text += '\n';
    }
  });

  text += 'Priorize a *fase excêntrica* e a *estabilidade escapular*. Qualquer dúvida, me chama!\n\n_Windson Personal Trainer_ 🏆';
  window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
}

function sendAvaliacaoToWhatsApp() {
  const phone = prompt('Digite o número do WhatsApp do cliente com DDD (Ex: 11999999999):');
  if (!phone) return;

  const clientName = document.getElementById('av-client-name')?.value || 'Cliente';
  let text = `*Olá ${clientName}! Sua Avaliação Postural Biomecânica (IA) foi concluída.* 📊\n\n`;
  text += 'Análise cinemática dos ângulos articulares:\n\n';

  const measNodes = document.querySelectorAll('#av-measurements .flex');
  if (!measNodes.length) { alert('Realize uma avaliação primeiro.'); return; }

  measNodes.forEach(node => {
    const label    = node.querySelector('p.font-bold')?.textContent    || '';
    const value    = node.querySelector('span.font-headline')?.textContent || '';
    const severity = node.querySelector('span.uppercase')?.textContent  || '';
    const emoji    = severity.includes('Crítico') ? '🚨' : severity.includes('Atenção') ? '⚠️' : '✅';
    text += `${emoji} *${label}*: ${value} (${severity})\n`;
  });

  text += '\n*Protocolo Corretivo Prescrito:*\n';
  document.querySelectorAll('#av-protocol > .glass-panel').forEach(card => {
    text += `\n🔹 _${card.querySelector('h4')?.textContent || ''}_\n`;
    card.querySelectorAll('p.font-bold').forEach(ex => { text += `• ${ex.textContent}\n`; });
  });

  text += '\nFoco total na execução corretiva antes das cargas máximas. Nos vemos na próxima sessão!\n\n_Windson Personal Trainer_ 🏆';
  window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
}

// ─── Exposição global (Opção A) ───────────────────────────────────────────────
window.fetchExercises        = fetchExercises;
window.getExercisesByMuscle  = getExercisesByMuscle;
window.searchExercises       = searchExercises;
window.renderExerciseCard    = renderExerciseCard;
window.exBankFilter          = exBankFilter;
window.exBankSearchDebounce  = exBankSearchDebounce;
window.exBankRender          = exBankRender;
window.exBankAddToWorkout    = exBankAddToWorkout;
window.showPiP               = showPiP;
window.hidePiP               = hidePiP;
window.sendWorkoutToWhatsApp = sendWorkoutToWhatsApp;
window.sendAvaliacaoToWhatsApp = sendAvaliacaoToWhatsApp;

// Alias de compatibilidade: showTab ainda chama exBankLoad('chest')
window.exBankLoad = async (muscle) => {
  _exBankSpinner('Carregando exercícios...');
  try {
    await fetchExercises();
    exBankRender(getExercisesByMuscle(muscle || _currentMuscle));
  } catch (e) {
    const list = document.getElementById('ex-bank-list');
    if (list) list.innerHTML = '<p class="text-xs text-center py-8 text-error">Erro ao carregar exercícios. Tente novamente.</p>';
  }
};
