-- ══════════════════════════════════════════════════════════════════════════════
-- Migração de segurança: RLS real baseado em auth.email()
--
-- PROBLEMA ANTERIOR: políticas "USING (true)" permitiam qualquer pessoa com
-- a anon key acessar todos os dados diretamente pela API REST do Supabase,
-- contornando a whitelist que estava só no JavaScript do browser.
--
-- SOLUÇÃO: cada policy agora exige que o usuário esteja autenticado (JWT válido)
-- E que o seu e-mail esteja na lista de e-mails autorizados.
-- Isso é verificado no servidor — não pode ser contornado pelo cliente.
--
-- COMO RODAR: cole este script no SQL Editor do painel Supabase
-- (https://supabase.com/dashboard → projeto → SQL Editor)
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Remover políticas permissivas antigas ────────────────────────────────

DROP POLICY IF EXISTS "Enable all for public" ON public.clientes;
DROP POLICY IF EXISTS "Enable all for public" ON public.agendamentos;
DROP POLICY IF EXISTS "Enable all for public" ON public.treinos;
DROP POLICY IF EXISTS "Enable all for public" ON public.avaliacoes_historico;
DROP POLICY IF EXISTS "Enable all for public" ON public.financeiro;

-- ─── 2. Função auxiliar: verifica se o e-mail logado é autorizado ────────────
-- Centraliza a lista num único lugar — para adicionar/remover acesso,
-- edite apenas esta função.

CREATE OR REPLACE FUNCTION public.is_allowed_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.email() IN (
    'windsonwood32@gmail.com',
    'gustavolima281189@gmail.com',
    'julio.cborges2@gmail.com'
  );
$$;

-- ─── 3. Novas políticas: autenticado + e-mail autorizado ─────────────────────

-- clientes
CREATE POLICY "allowed_users_only" ON public.clientes
  FOR ALL
  USING (public.is_allowed_user())
  WITH CHECK (public.is_allowed_user());

-- agendamentos
CREATE POLICY "allowed_users_only" ON public.agendamentos
  FOR ALL
  USING (public.is_allowed_user())
  WITH CHECK (public.is_allowed_user());

-- treinos
CREATE POLICY "allowed_users_only" ON public.treinos
  FOR ALL
  USING (public.is_allowed_user())
  WITH CHECK (public.is_allowed_user());

-- avaliacoes_historico
CREATE POLICY "allowed_users_only" ON public.avaliacoes_historico
  FOR ALL
  USING (public.is_allowed_user())
  WITH CHECK (public.is_allowed_user());

-- financeiro
CREATE POLICY "allowed_users_only" ON public.financeiro
  FOR ALL
  USING (public.is_allowed_user())
  WITH CHECK (public.is_allowed_user());

-- ─── 4. Verificação: listar políticas ativas ─────────────────────────────────
-- Rode este SELECT após a migração para confirmar que as políticas foram criadas.

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
