-- ══════════════════════════════════════════════════════════════════════════════
-- Migração: tabela medidas corporais + cliente_nome em avaliacoes_historico
--
-- COMO RODAR: cole no SQL Editor do painel Supabase
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabela de medidas corporais ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.medidas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  peso        NUMERIC(5,2),   -- kg
  altura      INTEGER,        -- cm
  gordura     NUMERIC(4,1),   -- %
  cintura     NUMERIC(5,1),   -- cm
  quadril     NUMERIC(5,1),   -- cm
  braco       NUMERIC(5,1),   -- cm
  observacoes TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.medidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allowed_users_only" ON public.medidas
  FOR ALL
  USING (public.is_allowed_user())
  WITH CHECK (public.is_allowed_user());

-- ─── 2. Adicionar cliente_nome a avaliacoes_historico ───────────────────────
-- Permite buscar histórico pelo nome digitado na avaliação,
-- sem exigir que o cliente esteja cadastrado no sistema.

ALTER TABLE public.avaliacoes_historico
  ADD COLUMN IF NOT EXISTS cliente_nome TEXT,
  ADD COLUMN IF NOT EXISTS score        NUMERIC(4,2);

-- ─── 3. Verificação ─────────────────────────────────────────────────────────

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('medidas', 'avaliacoes_historico')
ORDER BY table_name, ordinal_position;
