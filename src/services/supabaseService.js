// ════════════════════════════════════════════════════
// Supabase Service — Persistência de dados
// Responsável por: clientes, agendamentos, dashboard,
//                  agenda, treinos e financeiro.
// Depende de: window.sbClient criado em supabase_config.js
// ════════════════════════════════════════════════════

const sbClient = window.sbClient;

// ─── Clientes ────────────────────────────────────────────────────────────────

async function fetchClientes() {
  const grid = document.getElementById('clientes-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="skeleton-shimmer h-32 w-full"></div>
    <div class="skeleton-shimmer h-32 w-full"></div>
    <div class="skeleton-shimmer h-32 w-full"></div>
  `;

  try {
    const { data, error } = await sbClient.from('clientes').select('*');
    if (error) throw error;

    grid.innerHTML = '';

    if (!data || data.length === 0) {
      grid.innerHTML = '<p class="text-xs text-on-surface-variant col-span-full py-4 text-center">Nenhum cliente encontrado no banco de dados.</p>';
      return;
    }

    data.forEach((c) => {
      const init = c.nome_completo ? c.nome_completo.substring(0, 2).toUpperCase() : 'CL';
      const statusColor = c.status === 'Ativo' ? 'primary' : (c.status === 'Inativo' ? 'error' : 'outline-variant');

      const card = document.createElement('div');
      card.className = 'glass-panel stagger-item rounded-2xl p-6 flex flex-col gap-4 hover:shadow-[0_0_30px_rgba(212,175,55,0.1)] transition-all';
      card.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-full bg-${statusColor}/20 flex items-center justify-center text-${statusColor} font-headline font-bold text-xl border border-${statusColor}/30">${init}</div>
          <div class="flex-1">
            <h3 class="font-headline font-bold text-on-surface">${c.nome_completo || 'Cliente'}</h3>
            <p class="text-on-surface-variant text-xs font-label">${c.objetivo || 'Sem foco definido'} • ${c.telefone || 'Sem telefone'}</p>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap items-center justify-between">
          <span class="px-2 py-1 bg-${statusColor}/10 text-${statusColor} rounded-lg text-xs font-label border border-${statusColor}/20">${c.status || 'Pendente'}</span>
          <button onclick="openMedidasModal('${c.id}','${(c.nome_completo||'').replace(/'/g,"")}')" class="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-label transition-colors hover:bg-primary/10 active:scale-95" style="color:#9B7B0E;border:1px solid rgba(212,175,55,0.2);">
            <span class="material-symbols-outlined text-sm">monitor_weight</span>Medidas
          </button>
          <button onclick="deleteClienteData('${c.id}','${(c.nome_completo||'').replace(/'/g,"")}')" class="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-label transition-colors hover:bg-error/10 active:scale-95" style="color:#666;" title="Excluir todos os dados (LGPD)">
            <span class="material-symbols-outlined text-sm">delete</span>Excluir dados
          </button>
        </div>
      `;
      grid.appendChild(card);
      window.staggerObserver?.observe(card);
    });
  } catch (err) {
    console.error('Erro ao buscar clientes:', err);
    grid.innerHTML = '<p class="text-xs text-error col-span-full py-4 text-center">Erro de conexão com Supabase.</p>';
  }
}

async function createCliente() {
  const nome = document.getElementById('nc-nome').value;
  const tel  = document.getElementById('nc-tel').value;
  const obj  = document.getElementById('nc-obj').value;
  if (!nome) { alert('O nome é obrigatório!'); return; }

  const { error } = await sbClient.from('clientes').insert([{ nome_completo: nome, telefone: tel, objetivo: obj }]);
  if (error) { alert('Erro ao salvar cliente: ' + error.message); return; }

  window.closeModal('modal-novo-cliente');
  document.getElementById('nc-nome').value = '';
  document.getElementById('nc-tel').value  = '';
  document.getElementById('nc-obj').value  = '';
  window.fetchClientes();
}

// ─── Agendamentos ────────────────────────────────────────────────────────────

async function populateAgendamentoSelect() {
  const sel = document.getElementById('na-cliente');
  sel.innerHTML = '<option value="">Selecione o Cliente...</option>';
  const { data } = await sbClient.from('clientes').select('id, nome_completo');
  if (data) {
    data.forEach(c => {
      const opt = document.createElement('option');
      opt.value       = c.id;
      opt.textContent = c.nome_completo;
      sel.appendChild(opt);
    });
  }
}

async function createAgendamento() {
  const cid       = document.getElementById('na-cliente').value;
  const tipo      = document.getElementById('na-tipo').value;
  const dataLocal = document.getElementById('na-data').value;
  if (!cid || !dataLocal) { alert('Selecione cliente e data/hora!'); return; }

  const dBase   = new Date(dataLocal);
  const repetir = document.getElementById('na-repetir')?.checked;
  const semanas = repetir ? Math.max(1, parseInt(document.getElementById('na-semanas')?.value) || 1) : 1;

  const records = Array.from({ length: semanas }, (_, i) => {
    const dInicio = new Date(dBase.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    return {
      cliente_id:       cid,
      tipo:             tipo,
      data_hora_inicio: dInicio.toISOString(),
      data_hora_fim:    new Date(dInicio.getTime() + 60 * 60000).toISOString()
    };
  });

  const { error } = await sbClient.from('agendamentos').insert(records);
  if (error) { alert('Erro ao agendar: ' + error.message); return; }

  window.closeModal('modal-novo-agendamento');
  document.getElementById('na-cliente').value = '';
  document.getElementById('na-data').value    = '';
  const repetirEl = document.getElementById('na-repetir'); if (repetirEl) repetirEl.checked = false;
  const semanasEl = document.getElementById('na-semanas'); if (semanasEl) semanasEl.value = '4';
  document.getElementById('na-semanas-wrap')?.classList.add('hidden');
  if (typeof window.fetchDashboard === 'function') window.fetchDashboard();
  if (typeof window.fetchAgenda    === 'function') window.fetchAgenda();
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

async function fetchDashboard() {
  const el = document.getElementById('dashboard-agenda-list');
  if (!el) return;

  el.innerHTML = `
    <div class="skeleton-shimmer h-20 w-full rounded-xl"></div>
    <div class="skeleton-shimmer h-20 w-full rounded-xl mt-2"></div>
  `;

  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);

  const { data, error } = await sbClient.from('agendamentos')
    .select('*, clientes(nome_completo, avatar_url)')
    .gte('data_hora_inicio', start.toISOString())
    .lte('data_hora_inicio', end.toISOString())
    .order('data_hora_inicio', { ascending: true });

  if (error || !data) {
    el.innerHTML = '<p class="text-sm text-outline p-4 text-center">Não foi possível carregar a agenda. Verifique sua conexão.</p>';
    return;
  }

  const subtitle = document.getElementById('dashboard-sessoes-subtitle');
  if (subtitle) {
    const n = data.length;
    subtitle.textContent = n === 0
      ? 'Nenhuma sessão hoje'
      : `${n} ${n === 1 ? 'sessão' : 'sessões'} agendadas hoje`;
  }

  if (data.length === 0) {
    el.innerHTML = '<p class="text-sm text-outline p-4 text-center">Nenhum agendamento para hoje.</p>';
    return;
  }

  el.innerHTML = '';
  data.forEach(ag => {
    const d    = new Date(ag.data_hora_inicio);
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    el.innerHTML += `
      <div class="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-pointer">
        <div class="w-12 h-12 rounded-full overflow-hidden border border-outline-variant/30 relative shrink-0" style="background:#141414;">
          <span class="absolute inset-0 flex items-center justify-center font-bold text-[#D4AF37]">${ag.clientes?.nome_completo?.charAt(0) || '?'}</span>
        </div>
        <div class="flex-1">
          <p class="font-bold text-base text-on-surface leading-tight">${ag.clientes?.nome_completo || 'Cliente'}</p>
          <p class="text-sm text-on-surface-variant leading-tight">${ag.tipo}</p>
        </div>
        <div class="text-right">
          <p class="font-bold text-[#D4AF37] font-['Sora']">${time}</p>
          <p class="text-xs text-outline font-medium">${ag.status || ''}</p>
        </div>
      </div>
    `;
  });
}

// ─── Agenda ──────────────────────────────────────────────────────────────────

let _agendaCurrentDate = new Date();

function _renderAgendaCalendar(selectedDate) {
  const year  = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const mNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const mnEl = document.getElementById('agenda-month-name');
  const yrEl = document.getElementById('agenda-year-name');
  const wkEl = document.getElementById('agenda-week-label');

  if (mnEl) mnEl.textContent = mNames[month];
  if (yrEl) yrEl.textContent = year;

  if (wkEl) {
    const startW = new Date(selectedDate);
    startW.setDate(selectedDate.getDate() - selectedDate.getDay());
    const endW = new Date(startW);
    endW.setDate(startW.getDate() + 6);
    const getWeek = d => {
      const s = new Date(d.getFullYear(), 0, 1);
      return Math.ceil(((d - s) / 86400000 + s.getDay() + 1) / 7);
    };
    wkEl.textContent = `Semana ${getWeek(selectedDate)} • ${startW.getDate()} a ${endW.getDate()}`;
  }

  const grid = document.getElementById('agenda-calendar-days');
  if (!grid) return;

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = new Date();
  const selDay      = selectedDate.getDate();

  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday    = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const isSelected = selDay === d;
    let cls = 'p-2 rounded-full cursor-pointer transition-colors ';
    if (isSelected) {
      cls += 'bg-primary/20 text-primary font-bold border border-primary/30 shadow-[0_0_10px_rgba(212,175,55,0.2)]';
    } else if (isToday) {
      cls += 'text-primary hover:bg-surface-container-high';
    } else {
      cls += 'hover:bg-surface-container-high text-on-surface';
    }
    html += `<div class="${cls}" onclick="fetchAgenda(new Date(${year},${month},${d}))">${d}</div>`;
  }
  grid.innerHTML = html;
}

async function fetchAgenda(date) {
  const selectedDate = date ? new Date(date) : new Date();
  selectedDate.setHours(0, 0, 0, 0);
  _agendaCurrentDate = selectedDate;

  _renderAgendaCalendar(selectedDate);

  const dNames = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const mNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isToday = selectedDate.getTime() === today.getTime();

  const titleEl    = document.getElementById('agenda-day-title');
  const subtitleEl = document.getElementById('agenda-day-subtitle');
  if (titleEl)    titleEl.textContent    = isToday ? 'Hoje' : dNames[selectedDate.getDay()];
  if (subtitleEl) subtitleEl.textContent = `${dNames[selectedDate.getDay()]}, ${selectedDate.getDate()} de ${mNames[selectedDate.getMonth()]}`;

  const timeline = document.getElementById('agenda-timeline');
  if (timeline) timeline.innerHTML = '<div class="skeleton-shimmer h-20 w-full rounded-xl"></div>';

  const start = new Date(selectedDate);
  const end   = new Date(selectedDate); end.setHours(23, 59, 59, 999);

  const { data, error } = await sbClient.from('agendamentos')
    .select('*, clientes(nome_completo)')
    .gte('data_hora_inicio', start.toISOString())
    .lte('data_hora_inicio', end.toISOString())
    .order('data_hora_inicio', { ascending: true });

  if (error || !data) {
    if (timeline) timeline.innerHTML = '<p class="text-sm text-error p-4 text-center">Erro ao carregar agenda.</p>';
    return;
  }

  const sessoes    = data.filter(a => a.tipo !== 'Avaliação').length;
  const avaliacoes = data.filter(a => a.tipo === 'Avaliação').length;

  const csEl = document.getElementById('agenda-count-sessoes');
  const caEl = document.getElementById('agenda-count-avaliacoes');
  if (csEl) csEl.textContent = String(sessoes).padStart(2, '0');
  if (caEl) caEl.textContent = String(avaliacoes).padStart(2, '0');

  if (!timeline) return;

  if (data.length === 0) {
    timeline.innerHTML = '<p class="text-sm text-outline p-8 text-center">Nenhuma sessão agendada para este dia.</p>';
    return;
  }

  timeline.innerHTML = data.map(ag => {
    const d   = new Date(ag.data_hora_inicio);
    const df  = ag.data_hora_fim ? new Date(ag.data_hora_fim) : null;
    const t1  = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const t2  = df ? df.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    const timeStr    = df ? `${t1} – ${t2}` : t1;
    const isAv       = ag.tipo === 'Avaliação';
    const isCancelado = ag.status === 'Cancelado';
    const borderCls  = isCancelado ? 'border-l-outline-variant' : (isAv ? 'border-l-tertiary' : 'border-l-primary-container');
    const typeCls    = isCancelado ? 'text-outline'             : (isAv ? 'text-tertiary'     : 'text-primary-container');
    const cancelBtn  = isCancelado ? '' : `
      <button onclick="cancelarAgendamento('${ag.id}')" class="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-colors hover:bg-error/10 active:scale-95" style="color:#666;" title="Cancelar sessão">
        <span class="material-symbols-outlined text-sm">event_busy</span>Cancelar
      </button>`;
    return `
      <div class="glass-panel rounded-xl p-4 border-l-4 ${borderCls} flex flex-col gap-1 hover:bg-white/5 transition-colors ${isCancelado ? 'opacity-50' : ''}">
        <div class="flex justify-between items-center">
          <span class="text-xs font-label uppercase tracking-wider ${typeCls} font-semibold">${ag.tipo}</span>
          <span class="text-xs text-on-surface-variant font-label">${timeStr}</span>
        </div>
        <h4 class="text-on-surface font-headline font-semibold text-lg leading-tight">${ag.clientes?.nome_completo || 'Cliente'}</h4>
        <div class="flex items-center justify-between mt-1">
          ${ag.status ? `<span class="text-xs text-outline">${ag.status}</span>` : '<span></span>'}
          ${cancelBtn}
        </div>
      </div>`;
  }).join('');
}

// ─── Treinos ─────────────────────────────────────────────────────────────────

async function loadWorkoutClientSelector() {
  const sel = document.getElementById('workout-cliente-select');
  if (!sel || sel.options.length > 1) return; // já carregado
  const { data } = await sbClient.from('clientes').select('id, nome_completo').eq('status', 'Ativo');
  if (data) {
    data.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.dataset.nome = c.nome_completo;
      opt.textContent = c.nome_completo;
      sel.appendChild(opt);
    });
  }
}

function updateWorkoutClientLabel() {
  const sel   = document.getElementById('workout-cliente-select');
  const nome  = document.getElementById('workout-nome-input');
  const label = document.getElementById('workout-header-label');
  if (!label) return;
  const clienteNome = sel?.options[sel.selectedIndex]?.text || '';
  const nomeTreino  = nome?.value.trim() || '';
  const hasCliente  = clienteNome && clienteNome !== 'Selecionar Cliente...';
  if (hasCliente && nomeTreino) {
    label.textContent = `${nomeTreino} — ${clienteNome}`;
  } else if (hasCliente) {
    label.textContent = `Cliente: ${clienteNome}`;
  } else if (nomeTreino) {
    label.textContent = nomeTreino;
  } else {
    label.textContent = 'Selecione um cliente e nomeie o treino';
  }
}

async function openSaveWorkoutModal() {
  const sel = document.getElementById('sw-cliente');
  if (sel) {
    sel.innerHTML = '<option value="">Sem cliente específico</option>';
    const { data } = await sbClient.from('clientes').select('id, nome_completo');
    if (data) {
      data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nome_completo;
        sel.appendChild(opt);
      });
      // pré-seleciona o cliente escolhido no builder
      const builderSel = document.getElementById('workout-cliente-select');
      if (builderSel?.value) sel.value = builderSel.value;
    }
  }
  // pré-preenche nome do treino a partir do builder
  const builderNome = document.getElementById('workout-nome-input')?.value.trim();
  const swNome = document.getElementById('sw-nome');
  if (swNome && builderNome) swNome.value = builderNome;

  window.openModal('modal-salvar-treino');
}

async function saveWorkout() {
  const nome = document.getElementById('sw-nome')?.value.trim();
  const cid  = document.getElementById('sw-cliente')?.value || null;
  const foco = document.getElementById('sw-foco')?.value.trim() || '';
  if (!nome) { alert('Dê um nome ao treino!'); return; }

  const items = document.querySelectorAll('#workout-builder-list > .glass-panel');
  const exercicios = [];
  items.forEach(item => {
    const h4 = item.querySelector('h4');
    if (!h4) return;
    const inputs = item.querySelectorAll('input[type="text"]');
    exercicios.push({
      nome:     h4.textContent.trim(),
      series:   inputs[0]?.value || '',
      reps:     inputs[1]?.value || '',
      carga:    inputs[2]?.value || '',
      descanso: inputs[3]?.value || ''
    });
  });

  const { error } = await sbClient.from('treinos').insert([{
    nome,
    cliente_id: cid || null,
    foco,
    exercicios
  }]);

  if (error) { alert('Erro ao salvar treino: ' + error.message); return; }

  window.closeModal('modal-salvar-treino');
  if (document.getElementById('sw-nome'))    document.getElementById('sw-nome').value = '';
  if (document.getElementById('sw-foco'))    document.getElementById('sw-foco').value = '';
  alert('Treino salvo com sucesso!');
}

// ─── Financeiro ──────────────────────────────────────────────────────────────

async function fetchFinanceiro() {
  const el = document.getElementById('financeiro-fluxo');
  if (!el) return;

  el.innerHTML = `
    <div class="skeleton-shimmer h-20 w-full rounded-xl"></div>
    <div class="skeleton-shimmer h-20 w-full rounded-xl mt-3"></div>
    <div class="skeleton-shimmer h-20 w-full rounded-xl mt-3"></div>
  `;

  const { data, error } = await sbClient.from('pagamentos')
    .select('*, clientes(nome_completo)')
    .order('vencimento', { ascending: false })
    .limit(20);

  if (error || !data) {
    el.innerHTML = '<p class="text-xs text-error py-4 text-center">Erro ao carregar pagamentos.</p>';
    return;
  }

  if (data.length === 0) {
    el.innerHTML = '<p class="text-xs text-outline py-4 text-center">Nenhum pagamento registrado.</p>';
    return;
  }

  const statusMap = {
    'Pago':     { cls: 'text-primary',    bg: 'bg-primary-container/20', border: '',                          icon: 'photos'      },
    'Pendente': { cls: 'text-on-surface', bg: 'bg-surface-variant',      border: 'border border-outline-variant/30', icon: 'payments'    },
    'Atrasado': { cls: 'text-error',      bg: 'bg-error-container',      border: '',                          icon: 'credit_card' },
  };

  el.innerHTML = data.map(p => {
    const s         = statusMap[p.status] || statusMap['Pendente'];
    const iconCls   = p.status === 'Atrasado' ? 'text-error' : p.status === 'Pago' ? 'text-primary' : 'text-on-surface-variant';
    const bgIcon    = p.status === 'Atrasado' ? 'bg-error-container/30' : 'bg-surface-container';
    const valor     = parseFloat(p.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const cardBorder = p.status === 'Atrasado' ? 'border border-error/20' : '';
    return `
      <div class="bg-surface-container-highest rounded-xl p-4 flex justify-between items-center ${cardBorder}">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-full ${bgIcon} flex items-center justify-center">
            <span class="material-symbols-outlined ${iconCls}">${s.icon}</span>
          </div>
          <div>
            <p class="font-medium text-sm">${p.clientes?.nome_completo || 'Cliente'}</p>
            <p class="text-xs ${p.status === 'Atrasado' ? 'text-error' : 'text-on-surface-variant'}">${p.descricao || ''}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-sora font-semibold ${s.cls}">${valor}</p>
          <span class="inline-block px-2 py-1 rounded-md ${s.bg} ${s.cls} text-[10px] font-bold tracking-wider uppercase mt-1 ${s.border}">${p.status}</span>
        </div>
      </div>`;
  }).join('');
}

// ─── Medidas Corporais ────────────────────────────────────────────────────────

let _medidasClienteId = null;

async function openMedidasModal(clienteId, clienteNome) {
  _medidasClienteId = clienteId;
  document.getElementById('modal-medidas-titulo').textContent = clienteNome || 'Medidas Corporais';
  ['med-peso','med-altura','med-gordura','med-cintura','med-quadril','med-braco','med-obs'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('med-imc-wrap').classList.add('hidden');

  const histEl = document.getElementById('med-historico-wrap');
  const listEl = document.getElementById('med-historico-list');
  histEl.classList.add('hidden');

  const { data } = await sbClient.from('medidas')
    .select('*').eq('cliente_id', clienteId)
    .order('created_at', { ascending: false }).limit(3);

  if (data && data.length) {
    listEl.innerHTML = data.map(m => {
      const dt = new Date(m.created_at).toLocaleDateString('pt-BR');
      const imc = m.peso && m.altura ? (m.peso / Math.pow(m.altura / 100, 2)).toFixed(1) : '—';
      return `<div class="flex justify-between items-center px-3 py-2 rounded-xl text-xs" style="background:#141414;">
        <span style="color:#666;">${dt}</span>
        <span style="color:#AAA;">${m.peso ? m.peso + 'kg' : '—'} · IMC ${imc}</span>
        <span style="color:#666;">${m.gordura ? m.gordura + '% gord.' : ''}</span>
      </div>`;
    }).join('');
    histEl.classList.remove('hidden');
  }

  window.openModal('modal-medidas');
}

function calcIMC() {
  const peso   = parseFloat(document.getElementById('med-peso')?.value);
  const altura = parseFloat(document.getElementById('med-altura')?.value);
  const wrap   = document.getElementById('med-imc-wrap');
  if (!peso || !altura || altura < 50) { wrap.classList.add('hidden'); return; }
  const imc = peso / Math.pow(altura / 100, 2);
  const cat = imc < 18.5 ? { t: 'Abaixo do peso', c: '#60A5FA' }
            : imc < 25   ? { t: 'Peso normal',     c: '#D4AF37'  }
            : imc < 30   ? { t: 'Sobrepeso',        c: '#F0A020'  }
            :               { t: 'Obesidade',        c: '#ffb4ab'  };
  document.getElementById('med-imc-valor').textContent = imc.toFixed(1);
  document.getElementById('med-imc-valor').style.color = cat.c;
  document.getElementById('med-imc-cat').textContent   = cat.t;
  document.getElementById('med-imc-cat').style.background = cat.c + '22';
  document.getElementById('med-imc-cat').style.color       = cat.c;
  wrap.classList.remove('hidden');
}

async function saveMedida() {
  if (!_medidasClienteId) return;
  const get = id => parseFloat(document.getElementById(id)?.value) || null;
  const row = {
    cliente_id:  _medidasClienteId,
    peso:        get('med-peso'),
    altura:      parseInt(document.getElementById('med-altura')?.value) || null,
    gordura:     get('med-gordura'),
    cintura:     get('med-cintura'),
    quadril:     get('med-quadril'),
    braco:       get('med-braco'),
    observacoes: document.getElementById('med-obs')?.value.trim() || null,
  };
  if (!row.peso && !row.altura) { alert('Preencha ao menos peso ou altura.'); return; }

  const { error } = await sbClient.from('medidas').insert([row]);
  if (error) { alert('Erro ao salvar medidas: ' + error.message); return; }
  window.closeModal('modal-medidas');
}

// ─── Histórico de avaliações por nome ─────────────────────────────────────────

async function fetchAvaliacoesCliente(nome) {
  if (!nome) return [];
  const { data } = await sbClient.from('avaliacoes_historico')
    .select('score, created_at')
    .eq('cliente_nome', nome)
    .order('created_at', { ascending: false })
    .limit(5);
  return data || [];
}

// ─── Cancelar agendamento ─────────────────────────────────────────────────────

async function cancelarAgendamento(id) {
  if (!confirm('Cancelar esta sessão? O registro ficará marcado como Cancelado.')) return;
  const { error } = await sbClient.from('agendamentos').update({ status: 'Cancelado' }).eq('id', id);
  if (error) { alert('Erro ao cancelar: ' + error.message); return; }
  if (typeof window.fetchAgenda    === 'function') window.fetchAgenda();
  if (typeof window.fetchDashboard === 'function') window.fetchDashboard();
}

// ─── Exclusão de dados (LGPD art. 18 — direito ao esquecimento) ──────────────

async function deleteClienteData(id, nome) {
  const confirmado = window.confirm(
    `Excluir TODOS os dados de "${nome}"?\n\n` +
    `Isso removerá permanentemente:\n` +
    `• Cadastro e perfil\n` +
    `• Agendamentos\n` +
    `• Treinos\n` +
    `• Avaliações posturais\n` +
    `• Histórico financeiro\n\n` +
    `Esta ação não pode ser desfeita.`
  );
  if (!confirmado) return;

  // Deleções em paralelo (CASCADE no banco já cuida das FK, mas excluímos
  // explicitamente para garantir em caso de policies futuras que bloqueiem CASCADE).
  const [r1, r2, r3, r4, r5] = await Promise.all([
    sbClient.from('agendamentos').delete().eq('cliente_id', id),
    sbClient.from('treinos').delete().eq('cliente_id', id),
    sbClient.from('avaliacoes_historico').delete().eq('cliente_id', id),
    sbClient.from('avaliacoes_historico').delete().eq('cliente_nome', nome),
    sbClient.from('pagamentos').delete().eq('cliente_id', id),
  ]);

  const erros = [r1, r2, r3, r4, r5].filter(r => r.error).map(r => r.error.message);
  if (erros.length) {
    alert('Erro ao excluir dados relacionados:\n' + erros.join('\n'));
    return;
  }

  const { error } = await sbClient.from('clientes').delete().eq('id', id);
  if (error) { alert('Erro ao excluir cliente: ' + error.message); return; }

  fetchClientes();
}

// ─── Exposição global ─────────────────────────────────────────────────────────
window.openMedidasModal          = openMedidasModal;
window.saveMedida                = saveMedida;
window.calcIMC                   = calcIMC;
window.fetchAvaliacoesCliente    = fetchAvaliacoesCliente;
window.cancelarAgendamento       = cancelarAgendamento;
window.deleteClienteData         = deleteClienteData;
window.fetchClientes             = fetchClientes;
window.createCliente             = createCliente;
window.populateAgendamentoSelect = populateAgendamentoSelect;
window.createAgendamento         = createAgendamento;
window.fetchDashboard            = fetchDashboard;
window.fetchAgenda               = fetchAgenda;
window.loadWorkoutClientSelector = loadWorkoutClientSelector;
window.updateWorkoutClientLabel  = updateWorkoutClientLabel;
window.openSaveWorkoutModal      = openSaveWorkoutModal;
window.saveWorkout               = saveWorkout;
window.fetchFinanceiro           = fetchFinanceiro;
