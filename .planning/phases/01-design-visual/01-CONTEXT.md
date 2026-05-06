# Phase 1 — Design Visual: Context
_Captured: 2026-05-05_

## Domain
Melhorias visuais pontuais no app existente — sem redesign completo. Foco em três áreas específicas identificadas pelo usuário: descrições de exercícios, animação da agenda no dashboard, e botões de navegação rápida.

---

## Decisions

### 1. Descrições longas de exercícios
- **Decisão:** Truncar com "ver mais" — exibir 2-3 linhas, expandir ao tap
- **Comportamento:** Texto truncado com `line-clamp-3`, botão "ver mais" em gold abaixo
- **Escopo:** Tela de banco de exercícios / cards de exercício nos treinos

### 2. Agenda do dashboard — animação premium
- **Decisão:** Entrada suave dos cards — stagger animation ao carregar
- **Comportamento:** Cards aparecem sequencialmente com fade + slide-up, delay de ~80ms entre cada
- **Requisito:** Usar apenas `opacity` e `transform` (GPU composited — sem layout thrash)
- **Escopo:** Lista de agendamentos do dia na tela Dashboard

### 3. Botões de navegação rápida (Treino, Avaliação Postural, Clientes, Volume Semanal)
- **Decisão:** Fundo com foto/textura + overlay escuro — estilo card de categoria fitness
- **Comportamento:** Imagem de fundo (local ou Unsplash), overlay `rgba(0,0,0,0.55)`, texto e ícone em branco/gold sobre
- **Requisito:** Imagens devem ser leves (< 50KB cada) e carregadas lazy
- **Escopo:** Seção de ações rápidas no dashboard

### 4. Design geral
- **Decisão:** Manter o design atual como base — NÃO é um redesign
- **Fontes:** Manter Inter, Sora, Space Grotesk existentes — sem adicionar novas fontes
- **Cores:** Manter paleta dark gold existente — sem mudança na paleta
- **Nav bar:** Manter ícone + label atual

---

## Out of Scope (esta fase)
- Redesign completo de qualquer tela
- Mudanças na paleta de cores
- Troca de fontes
- Performance de carregamento (Phase 2)
- Novas funcionalidades

---

## Canonical Refs
- `src/css/input.css` — design system e animações existentes
- `index.html` — estrutura do dashboard e botões de navegação rápida
- `src/modules/ui.js` — lógica de UI e stagger observer existente
- `src/modules/exerciseBank.js` — renderização dos cards de exercício
- `.planning/PROJECT.md` — contexto do projeto
