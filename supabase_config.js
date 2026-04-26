const SUPABASE_URL = 'https://hddlvnmpbbkvzbhqmsjo.supabase.co';
// ATENÇÃO: Substitua essa chave ANON pela chave JWT válida do Supabase
const SUPABASE_ANON_KEY = 'sb_publishable_yyxQJR1aEgk-LqM9AcE2Yg_buifu5Y-'; 

// Cria a instância única do Supabase para o Windson
window.sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Atalho para compatibilidade com partes antigas do código
window.supabaseClient = window.sbClient;
window.supabase = window.supabase; // mantendo o objeto original do script CDN
