-- ══════════════════════════════════════════════════════════════════════════════
-- Fix: garante que cliente_id em avaliacoes_historico é nullable
-- Necessário para salvar avaliações de clientes não cadastrados no sistema.
--
-- COMO RODAR: cole no SQL Editor do painel Supabase (só é necessário se
-- o insert de avaliação estiver falhando silenciosamente)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.avaliacoes_historico
  ALTER COLUMN cliente_id DROP NOT NULL;

-- Verificação
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'avaliacoes_historico'
  AND column_name = 'cliente_id';
