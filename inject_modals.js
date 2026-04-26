const fs = require('fs');

let html = fs.readFileSync('C:\\Users\\gutow\\OneDrive\\Desktop\\Projetos_Clientes\\windson_pwa\\index.html', 'utf8');

// 1. Modais de Cadastro (HTML)
const modalsHTML = `
<!-- ═══ MODAL NOVO CLIENTE ═══ -->
<div id="modal-novo-cliente" class="hidden fixed inset-0 z-[150]" style="background:rgba(0,0,0,0.72);backdrop-filter:blur(6px);" onclick="closeModal('modal-novo-cliente')">
  <div onclick="event.stopPropagation()" class="absolute bottom-0 left-0 right-0 max-w-lg mx-auto" style="background:#0F0F0F;border-top:1px solid rgba(212,175,55,0.2);border-radius:28px 28px 0 0;box-shadow:0 -24px 64px rgba(0,0,0,0.7);transform:translateY(0%);">
    <div class="flex justify-center pt-4 pb-2"><div style="width:40px;height:4px;border-radius:99px;background:#2A2A2A;"></div></div>
    <p class="text-center text-xs font-bold uppercase tracking-[0.2em] pb-1 pt-2" style="color:#9B7B0E;font-family:'Sora',sans-serif;">Cadastrar</p>
    <p class="text-center text-base font-bold pb-5" style="color:#F0E8CC;font-family:'Sora',sans-serif;">Novo Cliente</p>
    <div class="px-6 pb-4 flex flex-col gap-4">
      <input id="nc-nome" type="text" placeholder="Nome Completo" class="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37] transition-colors" />
      <input id="nc-tel" type="tel" placeholder="Telefone / WhatsApp" class="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37] transition-colors" />
      <input id="nc-obj" type="text" placeholder="Objetivo (ex: Hipertrofia)" class="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37] transition-colors" />
      <button onclick="createCliente()" class="w-full mt-2 py-4 rounded-xl font-bold text-sm" style="background:linear-gradient(135deg,#F0C040,#D4AF37);color:#080808;">Salvar Cliente</button>
    </div>
  </div>
</div>

<!-- ═══ MODAL NOVO AGENDAMENTO ═══ -->
<div id="modal-novo-agendamento" class="hidden fixed inset-0 z-[150]" style="background:rgba(0,0,0,0.72);backdrop-filter:blur(6px);" onclick="closeModal('modal-novo-agendamento')">
  <div onclick="event.stopPropagation()" class="absolute bottom-0 left-0 right-0 max-w-lg mx-auto" style="background:#0F0F0F;border-top:1px solid rgba(212,175,55,0.2);border-radius:28px 28px 0 0;box-shadow:0 -24px 64px rgba(0,0,0,0.7);transform:translateY(0%);">
    <div class="flex justify-center pt-4 pb-2"><div style="width:40px;height:4px;border-radius:99px;background:#2A2A2A;"></div></div>
    <p class="text-center text-xs font-bold uppercase tracking-[0.2em] pb-1 pt-2" style="color:#9B7B0E;font-family:'Sora',sans-serif;">Marcar</p>
    <p class="text-center text-base font-bold pb-5" style="color:#F0E8CC;font-family:'Sora',sans-serif;">Nova Sessão</p>
    <div class="px-6 pb-4 flex flex-col gap-4">
      <select id="na-cliente" class="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37] transition-colors">
        <option value="">Selecione o Cliente...</option>
      </select>
      <select id="na-tipo" class="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37] transition-colors">
        <option value="Treino">Treino</option>
        <option value="Avaliação">Avaliação</option>
      </select>
      <input id="na-data" type="datetime-local" class="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37] transition-colors" />
      <button onclick="createAgendamento()" class="w-full mt-2 py-4 rounded-xl font-bold text-sm" style="background:linear-gradient(135deg,#F0C040,#D4AF37);color:#080808;">Agendar Sessão</button>
    </div>
  </div>
</div>
`;

html = html.replace('<!-- ═══ PREVIEW DE FOTO: CONFIRMAR OU CANCELAR ═══ -->', modalsHTML + '\n<!-- ═══ PREVIEW DE FOTO: CONFIRMAR OU CANCELAR ═══ -->');

// 2. Add onclick to "Novo" button in Tab 2 (Clientes)
html = html.replace('<button class="primary-gradient-bg px-4 py-2 rounded-xl text-sm font-bold text-surface-container-lowest hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center gap-1">', '<button onclick="openModal(\\'modal-novo-cliente\\')" class="primary-gradient-bg px-4 py-2 rounded-xl text-sm font-bold text-surface-container-lowest hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center gap-1">');

// 3. Add Javascript Functions
const jsFunctions = `
// Funções de Modal Dinâmico
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if(id === 'modal-novo-agendamento') populateAgendamentoSelect();
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// Criar Cliente
async function createCliente() {
  const nome = document.getElementById('nc-nome').value;
  const tel = document.getElementById('nc-tel').value;
  const obj = document.getElementById('nc-obj').value;
  if(!nome) return alert('O nome é obrigatório!');
  
  const { error } = await sbClient.from('clientes').insert([{ nome_completo: nome, telefone: tel, objetivo: obj }]);
  if(error) { alert('Erro ao salvar cliente: ' + error.message); return; }
  
  closeModal('modal-novo-cliente');
  document.getElementById('nc-nome').value = '';
  document.getElementById('nc-tel').value = '';
  document.getElementById('nc-obj').value = '';
  if(typeof fetchClientes === 'function') fetchClientes();
}

// Popular select do modal de agendamento
async function populateAgendamentoSelect() {
  const sel = document.getElementById('na-cliente');
  sel.innerHTML = '<option value="">Selecione o Cliente...</option>';
  const { data } = await sbClient.from('clientes').select('id, nome_completo');
  if(data) {
    data.forEach(c => {
      sel.innerHTML += \`<option value="\${c.id}">\${c.nome_completo}</option>\`;
    });
  }
}

// Criar Agendamento
async function createAgendamento() {
  const cid = document.getElementById('na-cliente').value;
  const tipo = document.getElementById('na-tipo').value;
  const dataLocal = document.getElementById('na-data').value;
  if(!cid || !dataLocal) return alert('Selecione cliente e data/hora!');
  
  const dInicio = new Date(dataLocal);
  const dFim = new Date(dInicio.getTime() + 60*60000); // +1 hora
  
  const { error } = await sbClient.from('agendamentos').insert([{ 
    cliente_id: cid, tipo: tipo, data_hora_inicio: dInicio.toISOString(), data_hora_fim: dFim.toISOString() 
  }]);
  
  if(error) { alert('Erro ao agendar: ' + error.message); return; }
  closeModal('modal-novo-agendamento');
  document.getElementById('na-data').value = '';
  if(typeof fetchDashboard === 'function') fetchDashboard();
  if(typeof fetchAgenda === 'function') fetchAgenda();
}

// Dashboard Dynamic Fetch
async function fetchDashboard() {
  const el = document.getElementById('dashboard-agenda-list');
  if(!el) return;
  // Get today's beginning and end
  const start = new Date(); start.setHours(0,0,0,0);
  const end = new Date(); end.setHours(23,59,59,999);
  
  const { data, error } = await sbClient.from('agendamentos')
    .select('*, clientes(nome_completo, avatar_url)')
    .gte('data_hora_inicio', start.toISOString())
    .lte('data_hora_inicio', end.toISOString())
    .order('data_hora_inicio', { ascending: true });
    
  if(error || !data) return;
  
  if(data.length === 0) {
    el.innerHTML = '<p class="text-sm text-outline p-4 text-center">Nenhum agendamento para hoje.</p>';
    return;
  }
  
  el.innerHTML = '';
  data.forEach(ag => {
    const d = new Date(ag.data_hora_inicio);
    const time = d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    el.innerHTML += \`
      <div class="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-pointer">
        <div class="w-12 h-12 rounded-full overflow-hidden border border-outline-variant/30 relative shrink-0" style="background:#141414;">
           <span class="absolute inset-0 flex items-center justify-center font-bold text-[#D4AF37]">\${ag.clientes?.nome_completo?.charAt(0) || '?'}</span>
        </div>
        <div class="flex-1">
          <p class="font-bold text-base text-on-surface leading-tight">\${ag.clientes?.nome_completo || 'Cliente'}</p>
          <p class="text-sm text-on-surface-variant leading-tight">\${ag.tipo}</p>
        </div>
        <div class="text-right">
          <p class="font-bold text-[#D4AF37] font-['Sora']">\${time}</p>
          <p class="text-xs text-outline font-medium">\${ag.status}</p>
        </div>
      </div>
    \`;
  });
}

// Inicializa chamadas dinamicas quando a tela carrega e Supabase estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if(typeof fetchDashboard === 'function') fetchDashboard();
  }, 1000);
});

// PWA: Service Worker
`;

html = html.replace('// PWA: Service Worker', jsFunctions);

// 4. Transform Dashboard static agenda to a dynamic div (remove the mock cards)
const dashboardMockStart = '<div class="glass-panel rounded-2xl overflow-hidden flex flex-col">';

const idxStart = html.indexOf(dashboardMockStart);
if(idxStart > -1) {
  const nextDiv = '<div class="glass-panel rounded-2xl p-5 relative overflow-hidden flex items-center gap-5 group cursor-pointer hover:shadow-[0_0_24px_rgba(212,175,55,0.15)] transition-all">';
  const idxNext = html.indexOf(nextDiv, idxStart);
  if(idxNext > -1) {
    const replacement = \`
  <div class="glass-panel rounded-2xl overflow-hidden flex flex-col">
    <div class="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
      <h3 class="font-bold text-on-surface text-sm flex items-center gap-2">
        <span class="material-symbols-outlined text-[#D4AF37] text-base">event_upcoming</span> Hoje
      </h3>
      <button onclick="openModal('modal-novo-agendamento')" class="text-xs font-bold px-2 py-1 rounded bg-[#141414] border border-[#D4AF37]/30 text-[#D4AF37]">+ Novo</button>
    </div>
    <div id="dashboard-agenda-list" class="flex flex-col">
       <p class="text-sm text-outline p-4 text-center">Carregando...</p>
    </div>
  </div>
  \`;
    html = html.substring(0, idxStart) + replacement + html.substring(idxNext);
  }
}

fs.writeFileSync('C:\\Users\\gutow\\OneDrive\\Desktop\\Projetos_Clientes\\windson_pwa\\index.html', html, 'utf8');
console.log("Modals injected and Dashboard made dynamic!");
