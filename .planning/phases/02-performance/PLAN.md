---
phase: 02-performance
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - index.html
  - vendor/supabase.js
  - sw.js
  - netlify.toml
  - src/css/input.css
  - dist/style.css
autonomous: false
requirements:
  - PERF-01
  - PERF-02
  - PERF-03
  - PERF-04

must_haves:
  truths:
    - "Supabase JS loads from ./vendor/supabase.js, not from cdn.jsdelivr.net"
    - "dist/style.css is preloaded async — no longer a render-blocking resource"
    - "Critical splash CSS (~3 KB) is inlined in <head> so the splash screen renders without waiting for dist/style.css"
    - "SW CACHE_NAME is windson-pt-v7, JS files use stale-while-revalidate strategy"
    - "netlify.toml has Cache-Control headers for /src/**, /vendor/**, /config.js, and /supabase_config.js"
    - "Inactive tab panels do not block layout at initial paint"
    - "Lighthouse mobile score is >= 80 on a cold (uncached) simulated run"
    - "Auth flow (Google OAuth) completes without errors after all changes"
    - "All six tabs render correctly after switching"
    - "Splash progress bar uses requestAnimationFrame instead of setInterval"
  artifacts:
    - path: "vendor/supabase.js"
      provides: "Self-hosted Supabase UMD v2.105.3"
      min_lines: 1
    - path: "index.html"
      provides: "Updated script tag, inlined critical CSS, async stylesheet link, rAF-based splash progress"
      contains: "./vendor/supabase.js"
    - path: "sw.js"
      provides: "Service worker with stale-while-revalidate for JS, CACHE_NAME windson-pt-v7"
      contains: "windson-pt-v7"
    - path: "netlify.toml"
      provides: "HTTP cache headers for JS and vendor assets"
      contains: "/src/**"
    - path: "src/css/input.css"
      provides: "content-visibility rules for tab sections"
      contains: "content-visibility"
  key_links:
    - from: "index.html"
      to: "vendor/supabase.js"
      via: "<script defer src>"
      pattern: "vendor/supabase\\.js"
    - from: "supabase_config.js"
      to: "window.supabase"
      via: "UMD global"
      pattern: "window\\.supabase|supabaseLib"
    - from: "sw.js"
      to: "JS assets"
      via: "stale-while-revalidate fetch handler"
      pattern: "windson-pt-v7"
    - from: "index.html"
      to: "dist/style.css"
      via: "preload+onload async pattern"
      pattern: "rel=\"preload\".*dist/style\\.css"
---

<objective>
Atingir score Lighthouse mobile >= 80 eliminando os principais gargalos de carregamento e execução do Windson PT PWA. As intervenções são cirúrgicas e não alteram nenhuma funcionalidade.

Purpose: O score atual é ~52. A lacuna de 28 pontos é fechada por cinco intervenções: (1) auto-hospedar o bundle Supabase JS para eliminar o RTT cross-origin, (2) converter o setInterval da splash screen para requestAnimationFrame para eliminar forced style recalcs durante o carregamento de módulos, (3) inline do CSS crítico do splash + carregamento assíncrono do stylesheet completo para desbloquear o FCP, (4) stale-while-revalidate no Service Worker + cache headers HTTP para visitas repetidas, (5) content-visibility nas seções de abas inativas para reduzir thrash de layout. Nenhuma dessas mudanças altera a lógica de autenticação, dados ou UI.

Output: vendor/supabase.js (novo), index.html modificado, sw.js modificado, netlify.toml modificado, src/css/input.css modificado, dist/style.css rebuild.
</objective>

<execution_context>
@/home/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/phases/02-performance/02-RESEARCH.md

<interfaces>
<!-- Contratos críticos que o executor deve respeitar sem precisar explorar o codebase. -->

De supabase_config.js (padrão verificado — NÃO alterar):
  O arquivo usa window.supabase.createClient(...) — o UMD global expõe window.supabase.
  Self-hosting do UMD é drop-in: nenhuma alteração em supabase_config.js é necessária.

De sw.js (estado atual verificado):
  CACHE_NAME atual: 'windson-pt-v6'
  Estratégia atual para JS: network-first (bloco isCode)
  Estratégia atual para CSS/imagens: cache-first
  Já tem: self.skipWaiting() no install, self.clients.claim() no activate

De src/css/input.css (estado atual verificado):
  Linha 117: .tab-section { display: none; }
  Linha 118: .tab-section.active { display: block; }
  Seção splash: linhas 235-392 (todos os estilos do #windson-splash e ids filhos)
  :root com CSS vars: linhas 6-28
  body: linhas 32-39

De netlify.toml (estado atual verificado):
  Já tem: /sw.js → no-cache, /manifest.json → max-age=86400
  Já tem: /*.png e /*.svg → max-age=604800
  Já tem: /dist/*.css → max-age=604800, must-revalidate
  Faltando: /src/**, /vendor/**, /config.js, /supabase_config.js

De index.html linha 26 (tag a substituir):
  <script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
De index.html linha 22 (tag a tornar async):
  <link rel="stylesheet" href="./dist/style.css"/>

Splash screen em index.html (bloco inline <script>, estado atual verificado):
  progressInterval = setInterval(function() { ... }, 160)  — linhas ~1048-1059
  clearInterval(progressInterval) chamado em exitSplash() — linha ~1065
  Variáveis relevantes: bar, tag, pct, msgs, msgIdx (todas var no mesmo escopo)
</interfaces>
</context>

<tasks>

<!-- ═══════════════════════════════════════════════════════════════════════════
     WAVE 1 — RENDER UNBLOCKING
     Tarefas 1, 1.5 e 2 são as de maior impacto. Executar primeiro.
     ═══════════════════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Tarefa 1: Auto-hospedar Supabase JS UMD</name>
  <files>vendor/supabase.js, index.html</files>
  <action>
**Passo 1 — Criar o diretório e baixar o bundle UMD:**

Execute no PowerShell a partir da raiz do projeto:

```powershell
New-Item -ItemType Directory -Force -Path ".\vendor"
Invoke-WebRequest `
  -Uri "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.3/dist/umd/supabase.js" `
  -OutFile ".\vendor\supabase.js"
```

Verifique que o arquivo baixou corretamente (deve ter ~192 KB):
```powershell
(Get-Item .\vendor\supabase.js).Length
```
Se o tamanho for menor que 100000 bytes, o download falhou — tente novamente.

**Passo 2 — Atualizar index.html:**

Na linha 26 de index.html, substitua:
```html
<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```
por:
```html
<script defer src="./vendor/supabase.js"></script>
```

**Por que UMD e não ESM:** O jsDelivr `+esm` está quebrado para supabase-js v2 (bug confirmado: github.com/orgs/supabase/discussions/41118 — `@supabase/auth-js` exporta `default null`, quebrando o rewrite do jsDelivr). O padrão `window.supabase.createClient()` em supabase_config.js requer o UMD global. Nenhuma alteração em supabase_config.js é necessária.

**O que NÃO fazer:** Não use o endpoint `+esm`, não renomeie o arquivo para `supabase.min.js` (o nome `supabase.js` combina com a regra de cache que será adicionada no netlify.toml na Tarefa 3).
  </action>
  <verify>
    <automated>powershell -Command "if ((Get-Item '.\vendor\supabase.js').Length -gt 100000) { 'OK: supabase.js presente e com tamanho correto' } else { 'ERRO: arquivo muito pequeno ou ausente' }"</automated>
    <automated>powershell -Command "Select-String -Path '.\index.html' -Pattern 'vendor/supabase\.js' | Select-Object -First 1"</automated>
    <automated>powershell -Command "if (Select-String -Path '.\index.html' -Pattern 'cdn\.jsdelivr\.net.*supabase') { 'ERRO: CDN ainda presente em index.html' } else { 'OK: CDN removida' }"</automated>
  </verify>
  <done>vendor/supabase.js existe com mais de 100 KB; index.html referencia ./vendor/supabase.js; nenhuma referência a cdn.jsdelivr.net/npm/@supabase permance em index.html.</done>
</task>

<task type="auto">
  <name>Tarefa 1.5: Converter splash progress bar de setInterval para requestAnimationFrame</name>
  <files>index.html</files>
  <read_first>Leia as linhas ~1036-1077 do inline &lt;script&gt; no index.html para localizar o bloco exato do setInterval e da função exitSplash antes de editar.</read_first>
  <action>
No bloco de script inline do splash (dentro de `(function() { ... })()` no final do `<body>`), localize e substitua o bloco da barra de progresso.

**Bloco atual a remover (linhas ~1048-1059):**

```javascript
  var progressInterval = setInterval(function () {
    if (pct >= 100) { clearInterval(progressInterval); return; }
    /* Acelera progressivamente */
    var step = pct < 60 ? 4 : pct < 85 ? 2.5 : 1;
    pct = Math.min(100, pct + step + Math.random() * 2);
    bar.style.transform = 'scaleX(' + (pct / 100) + ')';

    /* Muda mensagem em checkpoints */
    if (pct > 30 && msgIdx === 0) { msgIdx = 1; tag.textContent = msgs[1]; }
    if (pct > 65 && msgIdx === 1) { msgIdx = 2; tag.textContent = msgs[2]; }
    if (pct > 90 && msgIdx === 2) { msgIdx = 3; tag.textContent = msgs[3]; }
  }, 160);
```

**Substituir por:**

```javascript
  var rafId;
  var startTime = performance.now();
  /* Duração total simulada: ~2600ms para atingir 90% (mesmo ritmo visual do setInterval anterior) */
  var PROGRESS_DURATION = 2600;

  function tick(now) {
    var elapsed = now - startTime;
    /* Curva ease-out: progresso rápido no início, desacelera ao se aproximar de 90% */
    var t = Math.min(elapsed / PROGRESS_DURATION, 1);
    pct = Math.round(90 * (1 - Math.pow(1 - t, 2)));

    bar.style.transform = 'scaleX(' + (pct / 100) + ')';

    /* Muda mensagem em checkpoints */
    if (pct > 30 && msgIdx === 0) { msgIdx = 1; tag.textContent = msgs[1]; }
    if (pct > 65 && msgIdx === 1) { msgIdx = 2; tag.textContent = msgs[2]; }
    if (pct > 88 && msgIdx === 2) { msgIdx = 3; tag.textContent = msgs[3]; }

    if (pct < 90) {
      rafId = requestAnimationFrame(tick);
    }
  }
  rafId = requestAnimationFrame(tick);
```

**Em seguida**, localize a função `exitSplash()` (linha ~1064) e substitua `clearInterval(progressInterval)` por `cancelAnimationFrame(rafId)`:

```javascript
  function exitSplash() {
    cancelAnimationFrame(rafId);
    bar.style.transform = 'scaleX(1)';
    tag.textContent = 'Bem-vindo!';

    /* Pequeno delay para o usuário ver o 100% */
    setTimeout(function () {
      splash.classList.add('splash-exit');
      /* Remove do DOM depois da animação */
      splash.addEventListener('animationend', function () {
        splash.style.display = 'none';
      }, { once: true });
    }, 320);
  }
```

**Por que isso reduz TBT:** `setInterval(tick, 160)` agenda ~31 callbacks durante o carregamento, cada um forçando um recálculo de estilo (`bar.style.transform`). Esses recálculos competem com o parsing de módulos JS no main thread. `requestAnimationFrame` sincroniza com o ciclo de pintura do browser — os callbacks só disparam quando o browser está pronto para pintar, não em intervalos fixos que ignoram a carga do main thread. O resultado é menos contention de main thread durante a fase crítica de TBT.

**O que NÃO fazer:** Não remova a variável `var startTime` que já existe depois de `exitSplash()` (linha ~1081) — ela pertence ao mecanismo de `MIN_DURATION` e é independente. A nova `var startTime` declarada neste bloco usa o mesmo nome mas escopo diferente; se o linter reclamar, renomeie a nova para `var progressStartTime` e ajuste a referência dentro de `tick`.
  </action>
  <verify>
    <automated>powershell -Command "if (Select-String -Path '.\index.html' -Pattern 'requestAnimationFrame') { 'OK: requestAnimationFrame presente em index.html' } else { 'ERRO: requestAnimationFrame ausente — setInterval ainda em uso' }"</automated>
    <automated>powershell -Command "if (Select-String -Path '.\index.html' -Pattern 'cancelAnimationFrame') { 'OK: cancelAnimationFrame presente em exitSplash' } else { 'ERRO: cancelAnimationFrame ausente' }"</automated>
    <automated>powershell -Command "if (Select-String -Path '.\index.html' -Pattern 'progressInterval|setInterval.*160') { 'ERRO: setInterval ainda presente no splash — substituicao incompleta' } else { 'OK: setInterval removido do splash' }"</automated>
  </verify>
  <done>index.html não contém mais setInterval para o splash progress; requestAnimationFrame/cancelAnimationFrame são usados no lugar; o comportamento visual da barra (ease-out até 90%, mensagens nos mesmos checkpoints) é preservado.</done>
</task>

<task type="auto">
  <name>Tarefa 2: Inline CSS crítico do splash + async do stylesheet completo</name>
  <files>index.html</files>
  <action>
Esta tarefa tem dois sub-passos que devem ser feitos juntos: (a) inserir um bloco `<style>` com o CSS crítico, (b) trocar o `<link rel="stylesheet">` por preload assíncrono.

**Passo 1 — Substituir o `<link rel="stylesheet">` (linha 22) pelo padrão preload+onload:**

Substitua:
```html
<link rel="stylesheet" href="./dist/style.css"/>
```
por:
```html
<link rel="preload" href="./dist/style.css" as="style" onload="this.onload=null;this.rel='stylesheet'"/>
<noscript><link rel="stylesheet" href="./dist/style.css"/></noscript>
```

**Por que funciona sem FOUC:** O app está atrás de uma tela de autenticação. O usuário vê apenas a splash screen até o auth completar. A splash screen será coberta pelo CSS crítico inlinado abaixo. Quando o auth completar e a UI principal aparecer, o CSS assíncrono já terá carregado.

**Passo 2 — Inserir `<style>` com CSS crítico imediatamente ANTES do novo `<link rel="preload">` acima:**

Use este exato bloco. CSS custom properties (`:root` vars) sao mantidas como variaveis no bloco para autossuficiencia — o proprio `:root` esta inlinado, entao nao ha dependencia externa. O `<style>` nao depende do dist/style.css externo para funcionar:

```html
<style id="critical-css">
/* ── Reset e box-sizing (input.css linha 30) ── */
*, *::before, *::after { box-sizing: border-box; }

/* ── Body base — evita flash branco (input.css linhas 32-39, sem margin:0 extra) ── */
body {
  font-family: 'Inter', sans-serif;
  background-color: #050808;
  color: rgba(255,255,255,0.95);
  min-height: max(884px, 100dvh);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* ── CSS vars usadas pelo splash (input.css linhas 6-28, subconjunto) ── */
:root {
  --bg-deep: #050808;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}

/* ── Splash screen — todas as regras (input.css linhas 235-392) ── */
#windson-splash {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 40px;
  background: #040404;
  overflow: hidden;
}
#splash-stripes {
  position: absolute;
  inset: 0;
  overflow: hidden;
  opacity: 0;
  animation: splashStripesIn 0.8s 0.1s var(--ease-out) forwards;
}
@keyframes splashStripesIn {
  from { opacity: 0; transform: scaleY(0.85); }
  to   { opacity: 1; transform: scaleY(1); }
}
.stripe {
  position: absolute;
  top: -20%;
  width: 2px;
  height: 140%;
  border-radius: 99px;
  transform-origin: center;
  animation: stripeFlow 2.8s ease-in-out infinite;
  filter: blur(0.5px);
}
@keyframes stripeFlow {
  0%   { opacity: 0.05; transform: translateY(-6%) scaleY(0.92); }
  30%  { opacity: 0.9; }
  50%  { opacity: 1;    transform: translateY(0%)   scaleY(1); }
  70%  { opacity: 0.85; }
  100% { opacity: 0.05; transform: translateY(6%)   scaleY(0.92); }
}
#splash-logo {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  opacity: 0;
  transform: scale(0.80) translateY(16px);
  animation: splashLogoIn 0.9s 0.35s var(--ease-out) forwards;
}
@keyframes splashLogoIn {
  from { opacity: 0; transform: scale(0.80) translateY(16px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
#splash-icon {
  width: 96px;
  height: 96px;
  border-radius: 28px;
  background: linear-gradient(145deg, #1A1200, #0A0800);
  border: 1px solid rgba(212,175,55,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 0 0 1px rgba(212,175,55,0.08), 0 32px 64px rgba(0,0,0,0.8), 0 0 48px rgba(212,175,55,0.15);
}
#splash-icon::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 32px;
  box-shadow: 0 0 64px rgba(212,175,55,0.28);
  opacity: 0.3;
  animation: iconPulse 2s 1.2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes iconPulse {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 1; }
}
#splash-wordmark {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
#splash-wordmark h1 {
  font-family: 'Sora', sans-serif;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  background: linear-gradient(135deg, #F5D060, #D4AF37, #9B7B0E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}
#splash-wordmark p {
  font-family: 'Inter', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(212,175,55,0.50);
}
#splash-loader {
  position: relative;
  width: 160px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  opacity: 0;
  animation: splashLogoIn 0.6s 0.9s var(--ease-out) forwards;
}
#splash-track {
  width: 100%;
  height: 2px;
  background: rgba(255,255,255,0.06);
  border-radius: 999px;
  overflow: hidden;
}
#splash-bar {
  height: 100%;
  width: 100%;
  transform: scaleX(0);
  transform-origin: left;
  background: linear-gradient(90deg, #9B7B0E, #F0C040, #D4AF37);
  border-radius: 999px;
  box-shadow: 0 0 8px rgba(212,175,55,0.50);
  transition: transform 0.4s var(--ease-out);
}
#splash-tag {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.22);
}
#windson-splash.splash-exit {
  animation: splashExit 0.7s var(--ease-out) forwards;
  pointer-events: none;
}
@keyframes splashExit {
  0%   { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.06); }
}
</style>
```

**Ordem final das tags na `<head>` após as mudanças (verificar):**
1. `<meta charset>`, `<meta viewport>`, etc. — inalterados
2. `<link rel="preconnect">` — inalterados
3. `<link rel="modulepreload">` — inalterados
4. `<style id="critical-css">` — NOVO, inserido aqui
5. `<link rel="preload" href="./dist/style.css" as="style" onload="...">` — SUBSTITUIU o rel="stylesheet"
6. `<noscript><link rel="stylesheet" href="./dist/style.css"/></noscript>` — NOVO
7. `<link rel="preload" href="fonts.googleapis.com/...">` — inalterado (já era async)
8. `<noscript>` dos fonts — inalterado
9. `<script defer src="./vendor/supabase.js">` — já atualizado na Tarefa 1
10. Demais scripts — inalterados
  </action>
<verify>
    <automated>powershell -Command "if (Select-String -Path '.\index.html' -Pattern 'id=""critical-css""') { 'OK: bloco critical-css presente' } else { 'ERRO: bloco critical-css ausente' }"</automated>
    <automated>powershell -Command "if (Select-String -Path '.\index.html' -Pattern 'rel=""preload"" href=""./dist/style\.css"" as=""style""') { 'OK: dist/style.css carregado via preload async' } else { 'ERRO: preload ausente ou incorreto' }"</automated>
    <automated>powershell -Command "if (Select-String -Path '.\index.html' -Pattern 'splashExit') { 'OK: keyframe splashExit presente no CSS critico' } else { 'ERRO: CSS critico incompleto — splashExit ausente' }"</automated>
    <automated>powershell -Command "$content = Get-Content '.\index.html' -Raw; if ($content -match '(?s)(?<!<noscript>)[^\n]*rel=""stylesheet"" href=""./dist/style\.css""') { 'AVISO: stylesheet bloqueante detectado fora de noscript' } else { 'OK: nenhum stylesheet bloqueante direto (noscript excluido)' }"</automated>
    <automated>powershell -Command "if (Select-String -Path '.\index.html' -Pattern 'rel=""preload"".*dist/style\.css') { 'OK: preload presente' } else { 'ERRO: preload ausente' }; $content = Get-Content '.\index.html' -Raw; if ($content -match '(?s)(?<!noscript>)[^\n]*rel=""stylesheet"" href=""./dist/style\.css""') { 'AVISO: stylesheet bloqueante fora de noscript' } else { 'OK: stylesheet so em noscript ou preload' }"</automated>
  </verify>
  <done>index.html tem `<style id="critical-css">` com todas as regras do splash (sem margin:0 extra no body, CSS vars inlinadas no :root); dist/style.css e carregado via preload+onload (nao-bloqueante); o fallback noscript existe. Ao bloquear dist/style.css no DevTools (Network > Request blocking), a splash screen deve aparecer normalmente com animacoes.</done>
</task>

<!-- ═══════════════════════════════════════════════════════════════════════════
     CHECKPOINT — Wave 1 verification before continuing to Wave 2
     ═══════════════════════════════════════════════════════════════════════════ -->

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Wave 1 completa: Supabase self-hosted em ./vendor/supabase.js, splash progress bar convertida para requestAnimationFrame, CSS crítico inlinado no head, dist/style.css carregando de forma não-bloqueante.
  </what-built>
  <how-to-verify>
    1. Abra o projeto no navegador (pode ser via `npx serve .` ou `python -m http.server 8080` na raiz do projeto).
    2. Abra o DevTools (F12).
    3. **Verifique o carregamento do Supabase:**
       - Aba Network > filtre por "supabase" — deve aparecer `supabase.js` sendo carregado de `localhost` (não de `cdn.jsdelivr.net`).
    4. **Verifique o CSS não-bloqueante:**
       - Aba Network > filtre por "style.css" — o tipo de iniciador deve ser "Other" ou "preload", não "parser".
    5. **Verifique a splash screen sem o CSS externo:**
       - Network > botão "+" em Request Blocking > adicione o padrão `*dist/style.css*`
       - Recarregue a página.
       - A splash screen DEVE aparecer com fundo escuro (#040404), animacoes das stripes douradas e barra de progresso.
       - Se aparecer fundo branco ou sem estilos → o CSS crítico está incompleto (voltar à Tarefa 2).
    6. **Verifique que o auth ainda funciona:**
       - Remova o bloqueio do dist/style.css, recarregue.
       - Clique em "Entrar com Google" — o OAuth deve abrir normalmente.
       - Após login, todas as abas devem renderizar corretamente.
  </how-to-verify>
  <resume-signal>Digite "wave1-ok" se tudo funcionou, ou descreva o problema encontrado.</resume-signal>
</task>

<!-- ═══════════════════════════════════════════════════════════════════════════
     WAVE 2 — CACHING
     ═══════════════════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Tarefa 3: Service Worker stale-while-revalidate + cache headers HTTP</name>
  <files>sw.js, netlify.toml</files>
  <action>
**Parte A — Atualizar sw.js:**

Substitua o conteúdo COMPLETO de sw.js pelo seguinte. O único arquivo de SW é a raiz do projeto:

```javascript
const CACHE_NAME   = 'windson-pt-v7'; // bumped de v6 — força reinstalação da estratégia
const STATIC_CACHE = ['./manifest.json', './icon.svg', './dist/style.css'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Recursos externos (CDN, fonts, Supabase API): network-first, fallback cache
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // SW si mesmo: nunca interceptar
  if (url.pathname.endsWith('sw.js')) {
    return;
  }

  // HTML: network-first — mantém o app sempre atualizado
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request) || caches.match('./index.html'))
    );
    return;
  }

  // JS (incluindo /vendor/supabase.js e /src/**): stale-while-revalidate
  // Serve do cache imediatamente, atualiza em background
  if (url.pathname.endsWith('.js')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // CSS, imagens, ícones: cache-first (raramente mudam)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
```

**Por que stale-while-revalidate para JS (e não cache-first):** Cache-first serve JS estático indefinidamente até o CACHE_NAME mudar. Stale-while-revalidate serve do cache imediatamente (velocidade) mas sempre busca atualização em background (frescor). Para um app em desenvolvimento ativo como este, SWR é o balance correto.

**Parte B — Adicionar cache headers em netlify.toml:**

Adicione os seguintes blocos `[[headers]]` ao final do netlify.toml existente, ANTES dos blocos `[[redirects]]`:

```toml
[[headers]]
  for = "/src/**"
  [headers.values]
    Cache-Control = "public, max-age=86400, stale-while-revalidate=604800"

[[headers]]
  for = "/vendor/**"
  [headers.values]
    Cache-Control = "public, max-age=2592000, immutable"

[[headers]]
  for = "/config.js"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/supabase_config.js"
  [headers.values]
    Cache-Control = "public, max-age=86400"
```

**Rationale dos valores:**
- `/src/**` (1 dia + 7 dias SWR): JS de aplicação muda com deploy, mas 24h de cache reduz downloads drasticamente.
- `/vendor/**` (30 dias, immutable): supabase.js não mudará sem rename deliberado do arquivo.
- `/config.js` (no-cache): contém chaves de API — sempre verificar frescor.
- `/supabase_config.js` (1 dia): depende de config.js; 24h é seguro.

**Atenção:** Os blocos de `[[redirects]]` já existentes em netlify.toml devem permanecer intactos ao final do arquivo.
  </action>
  <verify>
    <automated>powershell -Command "if (Select-String -Path '.\sw.js' -Pattern 'windson-pt-v7') { 'OK: CACHE_NAME e v7' } else { 'ERRO: CACHE_NAME nao atualizado' }"</automated>
    <automated>powershell -Command "if (Select-String -Path '.\sw.js' -Pattern 'stale-while-revalidate|cached \|\| networkFetch') { 'OK: estrategia SWR presente em sw.js' } else { 'ERRO: SWR ausente em sw.js' }"</automated>
    <automated>powershell -Command "if (Select-String -Path '.\netlify.toml' -Pattern '/src/\*\*') { 'OK: regra /src/** presente em netlify.toml' } else { 'ERRO: regra /src/** ausente' }"</automated>
    <automated>powershell -Command "if (Select-String -Path '.\netlify.toml' -Pattern '/vendor/\*\*') { 'OK: regra /vendor/** presente em netlify.toml' } else { 'ERRO: regra /vendor/** ausente' }"</automated>
    <automated>powershell -Command "if (Select-String -Path '.\netlify.toml' -Pattern 'immutable') { 'OK: immutable presente para vendor' } else { 'ERRO: immutable ausente' }"</automated>
  </verify>
  <done>sw.js usa CACHE_NAME 'windson-pt-v7' e tem estratégia stale-while-revalidate para arquivos .js; netlify.toml tem as quatro regras de cache novas; os redirects existentes estão intactos.</done>
</task>

<!-- ═══════════════════════════════════════════════════════════════════════════
     WAVE 3 — DOM OPTIMIZATION
     ═══════════════════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Tarefa 4: content-visibility para abas inativas + rebuild do CSS</name>
  <files>src/css/input.css, dist/style.css</files>
  <action>
**Passo 1 — Atualizar regras de tab em src/css/input.css:**

Localize as linhas 117-118 de src/css/input.css:
```css
/* Tabs */
.tab-section { display: none; }
.tab-section.active { display: block; }
```

Substitua APENAS essas duas linhas por:
```css
/* Tabs — content-visibility: hidden pula rendering das abas inativas,
   preservando o layout cacheado para troca de abas instantânea.
   display: none é mantido via .hidden utility para outros usos no app. */
.tab-section {
  content-visibility: hidden;
  display: block;
}
.tab-section.active {
  content-visibility: visible;
}
```

**Por que isso é seguro:**
- `content-visibility: hidden` não remove o elemento do DOM — preserva o layout cacheado.
- Diferente de `display: none`, o browser não recalcula layout toda vez que a aba é exibida.
- A troca de abas em ui.js usa `.classList.toggle('active', ...)` — funciona identicamente.
- O `staggerObserver` em ui.js re-observa elementos em `_activateTab()` — compatível.
- Suporte: Chrome 85+, Firefox 124+, Safari 18+ (Baseline desde 2024).

**Risco residual (Pitfall 4 do RESEARCH.md):** `content-visibility: hidden` com `display: block` pode fazer abas inativas ocuparem espaço visual se tiverem altura intrínseca. Como as abas são seções full-width sem altura fixa, o risco de layout shift é baixo, mas teste visualmente no checkpoint.

**Fallback se houver layout shift:** Se alguma aba inativa aparecer ocupando espaço, adicione `contain-intrinsic-size: 0` ao `.tab-section` ou reverta para o padrão alternativo mais seguro:
```css
/* Alternativa segura se content-visibility causar problema: */
.tab-section { visibility: hidden; position: absolute; pointer-events: none; }
.tab-section.active { visibility: visible; position: static; pointer-events: auto; }
```

**Passo 2 — Rebuild do CSS compilado:**

Execute:
```powershell
npm run build:css
```

Confirme que dist/style.css foi atualizado (timestamp mais recente que antes do comando).

**O que NÃO fazer:** Não edite dist/style.css diretamente — ele é gerado pelo Tailwind CLI e será sobrescrito no próximo build.
  </action>
  <verify>
    <automated>powershell -Command "if (Select-String -Path '.\src\css\input.css' -Pattern 'content-visibility') { 'OK: content-visibility presente em input.css' } else { 'ERRO: content-visibility ausente' }"</automated>
    <automated>powershell -Command "if (Select-String -Path '.\dist\style.css' -Pattern 'content-visibility') { 'OK: content-visibility presente em dist/style.css (build OK)' } else { 'ERRO: dist/style.css nao tem content-visibility — rode npm run build:css' }"</automated>
    <automated>npm run build:css</automated>
  </verify>
  <done>src/css/input.css tem content-visibility nas regras .tab-section; dist/style.css foi rebuilt e contém a regra; o rebuild retornou exit code 0.</done>
</task>

<!-- ═══════════════════════════════════════════════════════════════════════════
     WAVE 4 — VERIFICATION
     ═══════════════════════════════════════════════════════════════════════════ -->

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Todas as cinco intervenções de performance foram aplicadas:
    1. Supabase self-hosted (vendor/supabase.js)
    2. Splash progress bar convertida para requestAnimationFrame (sem setInterval)
    3. CSS crítico inlinado + dist/style.css async
    4. SW windson-pt-v7 com stale-while-revalidate + cache headers no netlify.toml
    5. content-visibility para abas inativas
  </what-built>
  <how-to-verify>
    **A — Teste de regressão funcional (local):**

    1. Sirva o projeto localmente:
       ```
       npx serve . -p 8080
       ```
    2. Acesse http://localhost:8080
    3. Verifique a splash screen: fundo escuro, stripes douradas, barra de progresso animada.
    4. Faça login com Google — o OAuth deve completar normalmente.
    5. Após login, clique em cada uma das 6 abas (Dashboard, Clientes, Treinos, Avaliacao, Agenda, Financeiro) — cada uma deve renderizar sem problemas visuais (sem espaços em branco inexplicados, sem conteúdo sobreposto).
    6. DevTools > Application > Service Workers — confirme que "windson-pt-v7" está ativo (pode precisar de "Update" e reload).

    **B — Lighthouse mobile (depois de fazer deploy no Netlify):**

    Execute 3 vezes e registre a mediana:
    1. Chrome > DevTools > Lighthouse
    2. Categoria: Performance
    3. Dispositivo: Mobile
    4. Throttling: Simulated throttling (padrão)
    5. Execute em aba anônima, sem extensões.

    Score alvo: >= 80.

    Se o score ficou entre 70-79: verifique se a Tarefa 2 (async CSS) foi aplicada corretamente — é a intervenção de maior impacto individual.
    Se o score ficou abaixo de 70: relate qual oportunidade o Lighthouse está apontando como maior ganho restante.

    **C — Verificar content-visibility nas abas:**
    DevTools > Elements > inspecte uma das seções de aba inativa (ex: `#tab-clientes`).
    A propriedade `content-visibility: hidden` deve aparecer nos estilos computados.
  </how-to-verify>
  <resume-signal>
    Informe: (1) o score Lighthouse mobile mediano obtido, (2) se o auth + tabs funcionaram sem regressão, (3) se content-visibility foi confirmada no DevTools.
    
    Se score >= 80: fase concluída com sucesso.
    Se score < 80: descreva qual oportunidade o Lighthouse aponta como maior ganho restante para replanejar.
  </resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CDN externo → origem própria | vendor/supabase.js agora vem da origem, não do jsDelivr — elimina dependência de terceiro no caminho crítico |
| SW → rede | stale-while-revalidate requer que respostas de rede sejam confiáveis; respostas com status != 200 não são cacheadas |
| netlify.toml → cliente | Cache-Control headers controlam o que o browser mantém; /config.js tem no-cache para evitar chaves API obsoletas |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Tampering | vendor/supabase.js | mitigate | Pinado à versão exata 2.105.3 no nome do arquivo de origem; atualizar exige ação deliberada. SRI hash pode ser adicionado ao `<script>` como defense-in-depth: `integrity="sha384-..."` |
| T-02-02 | Tampering | sw.js stale-while-revalidate | accept | SWR serve JS cacheado imediatamente; um deploy malicioso exigiria comprometer o próprio Netlify. Fora do modelo de ameaça do app. |
| T-02-03 | Information Disclosure | /config.js com Cache-Control: no-cache | mitigate | no-cache garante que chaves de API sempre sejam reverificadas com o servidor. Não usar `public, max-age=*` para config.js. |
| T-02-04 | Denial of Service | SW caching JS obsoleto após deploy | mitigate | CACHE_NAME bumped para windson-pt-v7 força reinstalação do SW; activate handler deleta caches anteriores. |
| T-02-05 | Elevation of Privilege | inline CSS `<style>` em index.html | accept | CSS inlinado não é código executável; não introduz surface de XSS. Risco de privilege escalation via CSS é negligível neste contexto. |
</threat_model>

<verification>
## Verificação da fase completa

**Aceitação mínima:**
- [ ] `vendor/supabase.js` presente e com >100 KB
- [ ] `index.html` sem referência a `cdn.jsdelivr.net/npm/@supabase`
- [ ] `index.html` com `<style id="critical-css">` contendo `splashExit`
- [ ] `index.html` com `dist/style.css` carregando via `rel="preload"` (não `rel="stylesheet"`)
- [ ] `index.html` sem `setInterval` no bloco do splash (substituído por `requestAnimationFrame`)
- [ ] `sw.js` com `CACHE_NAME = 'windson-pt-v7'`
- [ ] `sw.js` com lógica `cached || networkFetch` para `.js` (stale-while-revalidate)
- [ ] `netlify.toml` com regra `/src/**` e `/vendor/**`
- [ ] `dist/style.css` com `content-visibility` (confirma rebuild)
- [ ] Auth flow (Google OAuth) sem erros
- [ ] Todas as 6 abas renderizam corretamente
- [ ] Score Lighthouse mobile >= 80 (mediana de 3 runs)

**Comandos de verificação rápida (PowerShell, raiz do projeto):**

```powershell
# 1. vendor/supabase.js presente
(Get-Item .\vendor\supabase.js).Length

# 2. CDN removida do index.html
Select-String -Path .\index.html -Pattern 'cdn\.jsdelivr\.net.*supabase'
# Saída esperada: nenhuma linha (sem match)

# 3. CSS crítico presente
Select-String -Path .\index.html -Pattern 'id="critical-css"'

# 4. dist/style.css async (preload)
Select-String -Path .\index.html -Pattern 'rel="preload" href="./dist/style.css"'

# 5. rAF em uso no splash (setInterval removido)
if (Select-String -Path .\index.html -Pattern 'progressInterval|setInterval.*160') {
  'ERRO: setInterval ainda presente no splash'
} else {
  'OK: setInterval removido'
}

# 6. SW versão v7
Select-String -Path .\sw.js -Pattern 'windson-pt-v7'

# 7. SWR em sw.js
Select-String -Path .\sw.js -Pattern 'cached \|\| networkFetch'

# 8. Cache headers netlify.toml
Select-String -Path .\netlify.toml -Pattern '/vendor/\*\*'

# 9. content-visibility em dist/style.css
Select-String -Path .\dist\style.css -Pattern 'content-visibility'
```
</verification>

<success_criteria>
A fase 02-performance está completa quando:

1. **Score Lighthouse mobile >= 80** — mediana de 3 runs consecutivos em aba anônima com throttling simulado padrão, após deploy no Netlify.

2. **Nenhuma regressão funcional** — auth Google OAuth completa sem erros; as 6 abas renderizam corretamente; operações Supabase (leitura/escrita de dados) funcionam normalmente.

3. **Todos os artefatos presentes** conforme a checklist de verificação acima.

4. **SW atualizado** — DevTools > Application > Service Workers mostra "windson-pt-v7" como ativo.
</success_criteria>

<output>
Após conclusão da fase, crie `.planning/phases/02-performance/02-01-SUMMARY.md` com:
- Score Lighthouse antes e depois (mediana de 3 runs)
- Quais intervenções foram aplicadas com sucesso
- Qualquer pitfall encontrado e como foi resolvido
- Decisões tomadas (ex: se a alternativa segura de tab visibility foi usada em vez de content-visibility)
</output>
