# Roadmap — Windson Personal Trainer PWA

## Milestone 1: Design & Performance

### Phase 1 — Visual Design & Typography Upgrade
**Goal:** Elevar a qualidade visual do app — tipografia, hierarquia, espaçamento, cores e componentes — para um nível premium condizente com personal trainer de alto padrão.
**Scope:**
- Sistema tipográfico: escolha e aplicação consistente de fontes, pesos, tamanhos e line-height
- Paleta de cores refinada: gold/dark com contraste adequado e variações de estado
- Componentes revisados: cards, botões, inputs, nav, modais
- Microanimações e transições (composited only)
- Responsividade mobile melhorada

**Out of scope:** Novas funcionalidades, mudanças no backend, autenticação.

---

### Phase 2 — Performance Optimization
**Goal:** Atingir score Lighthouse mobile ≥ 80, eliminando os principais gargalos de carregamento e execução.
**Scope:**
- Reduzir LCP e FCP (fontes, CSS crítico, lazy loading)
- Substituir/otimizar Supabase JS (CDN UMD → ESM ou self-hosted)
- Reduzir main-thread work (inline scripts, splash screen)
- Otimizar Service Worker e estratégia de cache
- Eliminar render-blocking resources restantes

**Out of scope:** Mudanças funcionais, redesign visual (coberto na Phase 1).
