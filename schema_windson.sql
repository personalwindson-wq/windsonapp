-- Tabela Clientes (Cria apenas se não existir. Preserva dados caso já esteja lá)
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo TEXT NOT NULL,
    telefone TEXT,
    objetivo TEXT,
    status TEXT DEFAULT 'Pendente',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela Agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'Treino', -- Treino, Avaliação, Reavaliação
    data_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_hora_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'Agendado', -- Agendado, Realizado, Cancelado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela Treinos (Rascunhos e Salvos)
CREATE TABLE IF NOT EXISTS public.treinos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    foco TEXT,
    exercicios JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela Histórico de Avaliações (Postural)
CREATE TABLE IF NOT EXISTS public.avaliacoes_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    score NUMERIC(4,2),
    medicoes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela Financeiro (Mensalidades e Sessões Avulsas)
CREATE TABLE IF NOT EXISTS public.financeiro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    data_vencimento DATE NOT NULL,
    status_pagamento TEXT DEFAULT 'Pendente', -- Pendente, Pago, Atrasado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Configuração Básica de Segurança (Row Level Security - Habilitar caso queira blindar totalmente)
-- Para MVP, vamos desabilitar restrições severas ou criar políticas permissivas já que a auth barra clientes na view
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;

-- Permitir tudo para authenticated/anon no MVP, a restrição de whitelist do front cuida do acesso real
CREATE POLICY "Enable all for public" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public" ON public.agendamentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public" ON public.treinos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public" ON public.avaliacoes_historico FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for public" ON public.financeiro FOR ALL USING (true) WITH CHECK (true);
