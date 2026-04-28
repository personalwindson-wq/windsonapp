// ════════════════════════════════════════════════════
// main.js — Ponto de entrada do Windson Personal Trainer PWA
//
// Carregado como <script type="module"> — diferido por padrão,
// executa após o HTML ser parseado e antes do DOMContentLoaded.
//
// Pré-requisitos (carregados antes como <script> regulares):
//   window.sbClient    → supabase_config.js
//   window.APP_CONFIG  → config.js
//   window.AV_PROTO    → src/data/avProto.js
//   window.AV_CONNS    → src/data/exEnMap.js
//   window.EX_EN_MAP   → src/data/exEnMap.js
//   window.avCol/avSev/avDrawLine → src/utils/geometry.js
//   window.loadExGif   → src/services/rapidApiService.js
// ════════════════════════════════════════════════════

// ─── Serviços e módulos (importados como efeito colateral) ───────────────────
// ui.js primeiro: staggerObserver deve estar em window antes que auth dispare fetchClientes
import './modules/ui.js';
import './services/supabaseService.js';
import './modules/auth.js';
import './modules/exerciseBank.js';
import './modules/avaliacao.js';

// ─── Data/saudação no dashboard ──────────────────────────────────────────────
(function () {
  const el = document.getElementById('dashboard-date');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) + ' • Síntese Diária';
})();

// ─── Service Worker ──────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[Windson PT] SW:', reg.scope);

        // Quando um novo SW assume o controle, recarrega automaticamente
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

        // Checa atualização a cada vez que o app é aberto
        reg.update();
      })
      .catch(e => console.warn('[Windson PT] SW error:', e));
  });
}

// ─── PWA Install Prompt ──────────────────────────────────────────────────────
let _dPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _dPrompt = e;
  const b = document.getElementById('install-banner');
  if (b) b.classList.remove('hidden');
});

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('install-btn');
  if (btn) btn.addEventListener('click', async () => {
    if (!_dPrompt) return;
    _dPrompt.prompt();
    await _dPrompt.userChoice;
    _dPrompt = null;
    const b = document.getElementById('install-banner');
    if (b) b.classList.add('hidden');
  });
});
