// Cria a instância única do Supabase para o Windson.
// As credenciais vêm de config.js (carregado antes deste script).
const SUPABASE_URL      = window.APP_CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.APP_CONFIG.SUPABASE_ANON_KEY;

window.sbClient       = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = window.sbClient;
