// ════════════════════════════════════════════════════
// UI Module — Navegação, modais e animações de entrada
//
// Dependências: nenhuma (opera apenas sobre o DOM).
// ════════════════════════════════════════════════════

// ─── Stagger Observer ────────────────────────────────────────────────────────

const staggerObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('stagger-show');
      obs.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

// ─── Navegação de abas ───────────────────────────────────────────────────────

let _exBankLoaded = false;

const _meshColors = {
  'tab-dashboard':  ['oklch(0.20 0.08 75)',  'oklch(0.15 0.06 80)'],
  'tab-clientes':   ['oklch(0.20 0.08 260)', 'oklch(0.15 0.06 280)'],
  'tab-treinos':    ['oklch(0.20 0.08 140)', 'oklch(0.15 0.06 160)'],
  'tab-avaliacao':  ['oklch(0.20 0.08 20)',  'oklch(0.15 0.06 35)'],
  'tab-agenda':     ['oklch(0.20 0.08 200)', 'oklch(0.15 0.06 220)'],
  'tab-financeiro': ['oklch(0.20 0.08 300)', 'oklch(0.15 0.06 320)'],
};

// Ativa a aba sem tocar no histórico — usado por showTab e pelo popstate handler.
function _activateTab(tabId) {
  const section = document.getElementById(tabId);
  if (!section) return;

  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  section.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const navBtn = document.querySelector('[data-tab="' + tabId + '"]');
  if (navBtn) navBtn.classList.add('active');
  window.scrollTo(0, 0);

  const colors = _meshColors[tabId];
  if (colors) {
    document.body.style.setProperty('--mesh-c1', colors[0]);
    document.body.style.setProperty('--mesh-c2', colors[1]);
  }

  requestAnimationFrame(() => {
    section.querySelectorAll('.stagger-item:not(.stagger-show)').forEach(el => {
      staggerObserver.unobserve(el);
      staggerObserver.observe(el);
    });
  });

  if (tabId === 'tab-treinos') {
    if (!_exBankLoaded) {
      _exBankLoaded = true;
      if (typeof window.exBankLoad === 'function') window.exBankLoad('chest');
    }
    if (typeof window.loadWorkoutClientSelector === 'function') window.loadWorkoutClientSelector();
  }
  if (tabId === 'tab-clientes')   { if (typeof window.fetchClientes  === 'function') window.fetchClientes(); }
  if (tabId === 'tab-agenda')     { if (typeof window.fetchAgenda    === 'function') window.fetchAgenda(); }
  if (tabId === 'tab-financeiro') { if (typeof window.fetchFinanceiro === 'function') window.fetchFinanceiro(); }
}

function showTab(tabId) {
  // Avaliação postural coleta dados biométricos sensíveis (LGPD art. 11).
  // Exige consentimento por sessão antes de entrar na aba.
  if (tabId === 'tab-avaliacao' && !sessionStorage.getItem('lgpd_av_consent')) {
    _openLgpdConsent();
    return;
  }
  history.pushState({ tab: tabId }, '', '#' + tabId.replace('tab-', ''));
  _activateTab(tabId);
}

// Botão Voltar do browser/Android — navega entre abas sem fechar o app.
window.addEventListener('popstate', e => {
  const tabId = (e.state && e.state.tab) ? e.state.tab : 'tab-dashboard';
  // Fecha qualquer modal aberto antes de navegar
  document.querySelectorAll('[id^="modal-"]').forEach(m => {
    if (!m.classList.contains('hidden')) m.classList.add('hidden');
  });
  _activateTab(tabId);
});

// Estado inicial: garante que o dashboard seja a entrada base do histórico
// para que o primeiro "Voltar" não quebre a navegação.
document.addEventListener('DOMContentLoaded', () => {
  history.replaceState({ tab: 'tab-dashboard' }, '', location.pathname + location.search);
});

// ─── Modais ──────────────────────────────────────────────────────────────────

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'modal-novo-agendamento') {
    if (typeof window.populateAgendamentoSelect === 'function') window.populateAgendamentoSelect();
  }
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ─── LGPD: consentimento para avaliação postural ─────────────────────────────

function _openLgpdConsent() {
  const check = document.getElementById('lgpd-consent-check');
  const btn   = document.getElementById('lgpd-consent-btn');
  if (check) { check.checked = false; }
  if (btn)   { btn.disabled = true; btn.style.opacity = '0.4'; }
  document.getElementById('modal-lgpd-consent').classList.remove('hidden');
}

function confirmLgpdConsent() {
  sessionStorage.setItem('lgpd_av_consent', '1');
  document.getElementById('modal-lgpd-consent').classList.add('hidden');
  showTab('tab-avaliacao');
}

function cancelLgpdConsent() {
  document.getElementById('modal-lgpd-consent').classList.add('hidden');
  showTab('tab-dashboard');
}

// ─── LGPD: política de privacidade ───────────────────────────────────────────

function openPrivacidade() {
  document.getElementById('user-menu').classList.add('hidden');
  document.getElementById('modal-privacidade').classList.remove('hidden');
}

function closePrivacidade() {
  document.getElementById('modal-privacidade').classList.add('hidden');
}

// ─── Exposição global ────────────────────────────────────────────────────────
window.staggerObserver    = staggerObserver;
window.showTab            = showTab;
window.openModal          = openModal;
window.closeModal         = closeModal;
window.confirmLgpdConsent = confirmLgpdConsent;
window.cancelLgpdConsent  = cancelLgpdConsent;
window.openPrivacidade    = openPrivacidade;
window.closePrivacidade   = closePrivacidade;
