# Tech Stack — Ecossistema Borges

Decisões técnicas com justificativa soberana.

---

## Frontend

### JavaScript Moderno
- **Padrão:** ES2022+, módulos nativos, sem transpilação onde evitável
- **Por quê:** Performance máxima, sem camadas de abstração desnecessárias, portabilidade total
- **Quando usar framework:** Apenas quando a complexidade de estado justificar (React/Svelte como opções soberanas)

### Tailwind CSS
- **Versão:** v4 (CSS-first config)
- **Por quê:** Utilitários composáveis, zero CSS morto em produção, design system como código
- **Padrão Borges:** Tokens customizados para tipografia, espaçamento e cor definidos em `@theme`
- **Anti-padrão:** Classes utilitárias para lógica que pertence a componentes

### Framer Motion
- **Uso:** Micro-interações, transições de página, animações de presença
- **Por quê:** API declarativa, performance via CSS transforms, integração natural com React
- **Padrão Borges:** Animações < 300ms para feedback, < 600ms para transições narrativas
- **Princípio:** Cada animação comunica algo. Decoração pura é cortada.

---

## Backend / BaaS

### Supabase
- **O quê:** PostgreSQL gerenciado + Auth + Storage + Realtime + Edge Functions
- **Por quê:** Open source, auto-hospedável, soberano — o cliente pode migrar para instância própria
- **Conta:** Sempre na conta do cliente. Nunca em conta Borges.

**Módulos em uso:**

| Módulo | Uso |
|--------|-----|
| `supabase-js` | Client-side queries e subscriptions |
| Auth | JWT, OAuth (Google, GitHub), magic link |
| Storage | Assets, uploads, CDN |
| Realtime | WebSocket subscriptions para features ao vivo |
| Edge Functions | Lógica server-side soberana (Deno) |

**Padrão de acesso:**
```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

**Segurança:** Row Level Security (RLS) ativado em todas as tabelas por padrão.

---

## Hosting

### Railway
- **O quê:** Plataforma de deploy com suporte a Node, Docker, e serviços gerenciados
- **Por quê:** Deploy simples, logs em tempo real, ambientes (staging/prod), preço justo
- **Conta:** Sempre na conta do cliente.
- **Padrão:** Um projeto Railway por produto. Serviços separados por responsabilidade.

**Configuração padrão:**
```toml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node server.js"
healthcheckPath = "/health"
```

---

## Estilo Visual

### Dark Mode
- **Padrão:** Dark-first. Light como variante opcional via `prefers-color-scheme`.
- **Paleta base:** Pretos profundos (`#0a0a0a`, `#111`), não cinzas genéricos
- **Contraste:** WCAG AA mínimo. AAA onde possível.

### Tipografia Refinada
- **Hierarchy:** Máximo 3 tamanhos de fonte por tela. Contraste por peso, não tamanho.
- **Fontes:** Variable fonts por padrão (performance + flexibilidade)
- **Sugestões soberanas:** Inter, Geist, Söhne, Instrument Serif para display
- **Tracking:** Letras apertadas em headings (`-0.02em`). Normal em body.

### Micro-interações
- **Regra:** Todo elemento interativo tem resposta visual em < 100ms
- **Hover:** Transições suaves, nunca abruptas. `transition: all` é proibido.
- **Focus:** Ring de foco visível e estilizado — acessibilidade é estética também.
- **Loading:** Skeleton states, não spinners. Feedback otimista onde seguro.

**Tokens de animação:**
```css
--duration-instant: 80ms;
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 400ms;
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.83, 0, 0.17, 1);
```

---

## Integrações de IA

### Anthropic Claude API
- **Uso:** Processamento de linguagem, geração de conteúdo, assistência contextual
- **Padrão:** Streaming por padrão via `stream: true`
- **Modelo padrão:** `claude-sonnet-4-6` (balancear custo/qualidade)
- **Modelo premium:** `claude-opus-4-7` para tarefas críticas

### VAD (Voice Activity Detection)
- **Biblioteca:** `@ricky0123/vad-web` (WebRTC nativo, sem servidor)
- **Padrão:** Componente isolado `<VoiceInput>` reutilizável
- **Pipeline:** VAD → Whisper/Deepgram (transcrição) → LLM → TTS → Audio

---

## Ferramentas de Desenvolvimento

| Ferramenta | Propósito |
|-----------|-----------|
| Vite | Build tool soberano, HMR instantâneo |
| ESLint + Prettier | Consistência de código automatizada |
| Vitest | Testes unitários, mesmo runtime do Vite |
| Playwright | Testes E2E soberanos |

---

*Este documento é um contrato técnico. Mudanças requerem justificativa soberana.*
