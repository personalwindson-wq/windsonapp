# Manifesto Borges AI

> "O rigor da forma é o que liberta o conteúdo."

## Visão

Construímos interfaces de luxo digital. Não sites — experiências.

Nosso norte estético é a interseção entre Apple e Stripe: onde cada pixel tem intenção, cada transição tem propósito, e o vazio é tão projetado quanto o preenchido.

**Três pilares:**

1. **Web Design de Luxo** — Beleza funcional. Nenhum elemento existe por decoração. Cada componente é editado até o essencial, então polido até o silêncio.

2. **Minimalismo Radical** — O que não serve, não entra. Interfaces que respiram. Tipografia que conduz. Cor como sinal, não ruído.

3. **Soberania Digital** — O cliente é dono do seu código, dos seus dados, da sua infraestrutura. Nenhuma dependência opaca. Nenhum lock-in velado.

---

## Arquitetura: White Label Sovereign

O padrão arquitetural central do ecossistema Borges.

**Princípio:** O código pertence ao cliente. A infra pertence ao cliente. Nós entregamos soberania, não serviço.

**O que isso significa na prática:**

- **Desacoplamento total** — Frontend, backend e banco de dados são camadas independentes que se comunicam por contratos claros (API REST / Realtime subscriptions).
- **Infra do cliente** — Supabase na conta do cliente. Railway na conta do cliente. Nós não hospedamos nada por padrão.
- **Zero vendor lock-in** — Código que pode ser migrado, bifurcado, adaptado. Sem SDKs proprietários que não possam ser substituídos.
- **Portabilidade como feature** — Qualquer projeto Borges pode ser entregue como um ZIP e rodado por outro desenvolvedor sem nós.

**Stack soberana:**
```
Cliente → Railway (hosting) → Frontend JS/Tailwind
                            → Supabase (auth + db + storage + realtime)
```

---

## Padrão de Código: Borges Standard

### JavaScript Moderno

- ES Modules nativos. Sem CommonJS em código novo.
- `async/await` por padrão. Promises encadeadas são sinal de refatoração pendente.
- Sem frameworks pesados onde vanilla resolve. Frameworks existem para escalar complexidade — não para começar com ela.
- Types via JSDoc onde necessário. TypeScript quando a escala justificar.

### Módulos Limpos

```
Cada módulo tem uma responsabilidade.
Cada função tem um retorno previsível.
Cada efeito colateral é explícito.
```

- Nomes que documentam. Comentários só para o não-óbvio.
- Funções puras onde possível. Estado gerenciado em camada dedicada.
- Imports explícitos. Sem barrel exports que obscurecem dependências.

### Performance como Obrigação

- First Contentful Paint < 1.5s é o piso, não o teto.
- Imagens otimizadas, lazy-loaded, com dimensões declaradas.
- CSS crítico inline. JS não-crítico diferido.
- Core Web Vitals monitorados em produção.

### Ganchos para IA (VAD / Voz)

O ecossistema Borges é projetado para IA de primeira classe:

- **VAD (Voice Activity Detection)** — Interfaces de voz integradas como camada nativa, não plugin. Componentes de captura de áudio isolados e reutilizáveis.
- **Voz como Input** — Formulários, comandos e navegação devem suportar entrada por voz sem reescrita de lógica.
- **Hooks de IA** — Pontos de extensão documentados para integração com modelos de linguagem (Claude, etc.) via API Anthropic ou equivalente.
- **Streaming por padrão** — Respostas de IA chegam em stream. A UI consome incrementalmente.

```js
// Padrão Borges para integração de IA
const stream = await ai.stream(prompt);
for await (const chunk of stream) {
  ui.append(chunk);
}
```

---

## Protocolo para IAs Parceiras

Quando uma IA (Claude, Antigravity, ou outra) trabalha neste ecossistema:

1. **Leia este manifesto primeiro.** A filosofia precede a implementação.
2. **Não adicione dependências sem justificativa soberana.** Cada `npm install` é uma decisão arquitetural.
3. **Preserve o desacoplamento.** Se sua solução cria acoplamento, proponha antes de implementar.
4. **Estética é funcional.** Não separe "design" de "código" — são a mesma coisa aqui.
5. **O cliente é o produto.** Entregamos agência, não dependência.

---

*Borges AI — Engenharia com intenção.*
