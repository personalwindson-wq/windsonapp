// ════════════════════════════════════════════════════
// Auth Module — Autenticação e controlo de acesso
//
// Dependências (carregadas antes deste script):
//   window.sbClient       → supabase_config.js
//   window.fetchDashboard → src/services/supabaseService.js
//   window.fetchClientes  → src/services/supabaseService.js
// ════════════════════════════════════════════════════

const sbClient = window.sbClient;

// ─── Whitelist (UX-only) ─────────────────────────────────────────────────────
// Esta lista serve apenas para exibir o erro rapidamente na tela sem esperar
// uma chamada ao banco. A segurança REAL está no RLS do Supabase — a função
// is_allowed_user() no banco rejeita qualquer query de e-mail não autorizado,
// mesmo que alguém contorne esta checagem client-side.
// Para adicionar/remover acesso, edite também supabase_rls_migration.sql.

const ALLOWED_EMAILS = [
  'windsonwood32@gmail.com',
  'gustavolima281189@gmail.com',
  'julio.cborges2@gmail.com',
  'personalwindson@gmail.com',
];

// ─── Gatekeeper ──────────────────────────────────────────────────────────────

function checkAccess(email) {
  return ALLOWED_EMAILS.includes(email);
}

// ─── OAuth ───────────────────────────────────────────────────────────────────

async function signInWithGoogle() {
  try {
    const { error } = await sbClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: { access_type: 'offline', prompt: 'select_account' },
        redirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) throw error;
  } catch (err) {
    alert('Erro ao conectar com Google: ' + err.message);
  }
}

async function signInWithApple() {
  try {
    const { error } = await sbClient.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
  } catch (err) {
    alert('Erro ao conectar com Apple: ' + err.message);
  }
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

function _showApp(user) {
  document.getElementById('login-screen').classList.add('hidden');
  document.body.classList.add('authenticated');

  const avatarImg  = document.getElementById('header-avatar-img');
  const avatarName = document.getElementById('header-avatar-name');
  const avatarBtn  = document.getElementById('header-avatar-btn');
  const menuName   = document.getElementById('menu-user-name');
  const menuEmail  = document.getElementById('menu-user-email');

  if (user.picture) avatarImg.src = user.picture;
  avatarName.textContent = user.given_name || user.name;
  menuName.textContent   = user.name;
  menuEmail.textContent  = user.email;
  avatarBtn.classList.remove('hidden');
  avatarBtn.classList.add('flex');
}

function _showLoginError(_email) {
  const el = document.getElementById('login-error-msg');
  if (el) {
    el.innerHTML = 'Acesso Restrito';
    el.classList.remove('hidden');
  } else {
    alert('Acesso Restrito');
  }
}

function toggleUserMenu() {
  document.getElementById('user-menu').classList.toggle('hidden');
}

function logout() {
  localStorage.removeItem('windson_user');
  if (window.google?.accounts) window.google.accounts.id.disableAutoSelect();
  sbClient.auth.signOut();
  document.body.classList.remove('authenticated');
  document.getElementById('user-menu').classList.add('hidden');
  document.getElementById('header-avatar-btn').classList.add('hidden');
  document.getElementById('header-avatar-btn').classList.remove('flex');
  document.getElementById('login-screen').classList.remove('hidden');
}

// ─── Observer de sessão ──────────────────────────────────────────────────────

function init() {
  // Fecha menu ao clicar fora
  document.addEventListener('click', e => {
    const menu = document.getElementById('user-menu');
    const btn  = document.getElementById('header-avatar-btn');
    if (!menu || !btn) return;
    if (!menu.classList.contains('hidden') && !menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });

  sbClient.auth.onAuthStateChange((event, session) => {
    if (!session) {
      document.body.classList.remove('authenticated');
      document.getElementById('login-screen').classList.remove('hidden');
      return;
    }

    const payload = session.user.user_metadata || {};
    const user = {
      name:       payload.full_name || session.user.email,
      email:      session.user.email,
      picture:    payload.avatar_url || '',
      given_name: payload.name || (payload.full_name ? payload.full_name.split(' ')[0] : 'Admin')
    };

    if (!checkAccess(user.email)) {
      _showLoginError(user.email);
      sbClient.auth.signOut();
      return;
    }

    const errorEl = document.getElementById('login-error-msg');
    if (errorEl) errorEl.classList.add('hidden');

    _showApp(user);

    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
      // Borges Brain OS — inicialização completa do dashboard
      if (typeof window.fetchDashboard === 'function') window.fetchDashboard();
      if (typeof window.fetchClientes  === 'function') window.fetchClientes();
    }
  });
}

// ─── Exposição global (Opção A — compatibilidade com onclick do HTML) ─────────
window.signInWithGoogle = signInWithGoogle;
window.signInWithApple  = signInWithApple;
window.toggleUserMenu   = toggleUserMenu;
window.logout           = logout;

// Aliases para os onclick existentes no HTML (não mudar o HTML ainda)
window.triggerGoogleLogin = signInWithGoogle;
window.triggerAppleLogin  = signInWithApple;
window.doLogout           = logout;

// Arranca o observer imediatamente
init();
