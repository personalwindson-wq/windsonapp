# Phase 2: Performance Optimization — Research

**Researched:** 2026-05-05
**Domain:** Web Performance (Core Web Vitals, Lighthouse mobile, PWA caching, third-party JS)
**Confidence:** HIGH (codebase verified by direct read; library behaviors cited from official docs and verified discussions)

---

## Summary

The Windson PT PWA currently scores ~52 on Lighthouse mobile. The target is ≥ 80. This is a 28-point gap, achievable without any functional changes.

The two dominant bottlenecks are (1) the Supabase JS CDN dependency — a 192 KB UMD bundle fetched from an external CDN with no guaranteed cache header — and (2) the 44.8 KB compiled CSS that is render-blocking (loaded with `<link rel="stylesheet">` in `<head>` with no async technique). Both block First Contentful Paint. Together they likely account for 15-20 Lighthouse points.

Secondary contributors are: the large DOM (~755 HTML elements across all tabs simultaneously in memory), inline splash screen script running on the main thread with a `setInterval`, no HTTP cache headers for JS files, and the Google Fonts loading pattern having a missing `font-display` annotation that could still cause FOIT on slow connections.

The good news: Phase 1 already eliminated several blocking issues (scripts have `defer`, `modulepreload` hints are in place, `transform: scaleX()` replaces `width` for the progress bar animation). The remaining interventions are surgical and low-risk.

**Primary recommendation:** Self-host the Supabase JS bundle as a vendored local file, inline the critical CSS for the splash screen (~2 KB), add `stale-while-revalidate` to the service worker for local JS assets, and apply `content-visibility: hidden` to inactive tab sections.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CSS delivery (critical path) | Browser/HTML | Netlify CDN | Inline critical styles block no request; rest async |
| Supabase JS bundle | Netlify CDN (self-hosted) | Browser cache | Move from external CDN to own origin eliminates cross-origin RTT |
| Font loading | External CDN (Google) | Browser cache | Preload + `font-display: swap` already applied; tweak only |
| Service Worker caching | Browser (SW) | — | Controls repeat-visit performance; all strategies run in SW |
| DOM size management | Browser/HTML | — | Tab visibility via CSS; no framework, no virtual DOM |
| Splash screen main-thread | Browser/JS | — | `setInterval` runs synchronously on main thread during load |
| HTTP cache headers | Netlify CDN | — | `netlify.toml` controls `Cache-Control` for each file pattern |

---

## Current State Assessment

### Load Sequence (verified from index.html lines 1-52)

```
<head> parse starts
 ├── <link rel="preconnect" href="fonts.googleapis.com">     — OK, no delay
 ├── <link rel="preconnect" href="fonts.gstatic.com">        — OK
 ├── <link rel="modulepreload" href="./src/main.js">         — OK (Phase 1 done)
 ├── <link rel="modulepreload" href="./src/modules/ui.js">   — OK
 ├── <link rel="modulepreload" href="./src/modules/auth.js"> — OK
 ├── <link rel="modulepreload" href="./src/modules/avaliacao.js"> — OK
 ├── <link rel="modulepreload" href="./src/modules/exerciseBank.js"> — OK
 ├── <link rel="modulepreload" href="./src/services/supabaseService.js"> — OK
 ├── <link rel="stylesheet" href="./dist/style.css"/>        — RENDER-BLOCKING (44.8 KB)
 ├── <link rel="preload" href="fonts.googleapis.com/css2?...display=swap" as="style" onload="..."> — async OK
 ├── <script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">  — EXTERNAL, 192 KB UMD
 ├── <script defer src="./config.js">                        — deferred OK
 ├── <script defer src="./supabase_config.js">              — deferred OK
 ├── <style>@keyframes ex-frame-a...</style>                 — inline 611 chars, fine
 ├── <script defer src="./src/data/avProto.js">             — deferred OK
 ├── <script defer src="./src/data/exEnMap.js">             — deferred OK
 ├── <script defer src="./src/utils/geometry.js">           — deferred OK
 ├── <script defer src="./src/services/rapidApiService.js"> — deferred OK
 └── <script type="module" src="./src/main.js">             — module (deferred by default) OK
<body>
 └── ... 755 HTML elements (all tabs in DOM simultaneously) ...
 └── <script> (inline, line 1001) — SPLASH SCREEN INIT, runs on main thread
```

[VERIFIED: direct read of index.html]

### Key Measurements

| Asset | Size | Cache Header | Impact |
|-------|------|-------------|--------|
| `dist/style.css` | 44.8 KB minified | `public, max-age=604800` | RENDER-BLOCKING — blocks FCP |
| `@supabase/supabase-js@2` (CDN UMD) | 192 KB unminified | Unknown (external CDN) | External RTT + 192 KB parse cost |
| `index.html` | 98.7 KB | Netlify default `max-age=0, must-revalidate` | Large payload |
| `src/modules/avaliacao.js` | 30.8 KB | No explicit cache rule → Netlify default | Full re-download on each visit |
| `src/services/supabaseService.js` | 28.9 KB | No explicit cache rule | Full re-download on each visit |
| All `.js` files (src/) | ~101 KB total | No explicit cache rule | All re-download each visit |
| `input.css` (source) | 10.5 KB | n/a (build artifact) | Tailwind scans index.html + src/**/*.js |

[VERIFIED: direct file size measurements via PowerShell]

### Netlify Cache Header Gap (VERIFIED from netlify.toml)

```toml
# PRESENT:
/sw.js           → no-cache (correct)
/manifest.json   → max-age=86400
/*.png           → max-age=604800
/*.svg           → max-age=604800
/dist/*.css      → max-age=604800, must-revalidate

# MISSING (no rule → Netlify default max-age=0, must-revalidate):
/*.js            → no cache rule
/src/**/*.js     → no cache rule
/config.js       → no cache rule
/supabase_config.js → no cache rule
```

[VERIFIED: netlify.toml read directly; Netlify default confirmed via official docs: "max-age=0, must-revalidate"]

### Service Worker Strategy (VERIFIED from sw.js)

```
External resources (CDN, fonts, Supabase):  network-first, fallback to cache
HTML + JS files (origin):                   network-first, cache on 200
CSS, images, icons (origin):                cache-first (matches Cache-Control rule)
```

Current SW is version `windson-pt-v6`. The network-first strategy for JS means every visit triggers a network request for ALL JS files — even if unchanged. Combined with no HTTP cache headers on JS, this means every visit re-downloads ~101 KB of JS from scratch.

[VERIFIED: sw.js read directly]

### DOM Size (VERIFIED by PowerShell element count)

```
Total opening tags:  ~755 (Lighthouse warns at >800, errors at >1,400)
<div> count:          269
<section> count:       21
<button> count:        53
<span> count:         106
<input> count:         36
```

Six full tab sections (`tab-dashboard`, `tab-clientes`, `tab-treinos`, `tab-avaliacao`, `tab-agenda`, `tab-financeiro`) are all in the DOM simultaneously, with only CSS `display: none` hiding inactive tabs. This means the browser must lay out, style-calculate, and hold all 755 nodes in memory on first paint — even though the user only sees one tab.

### Google Fonts Loading (VERIFIED from index.html line 23)

The current pattern:
```html
<link rel="preload" href="https://fonts.googleapis.com/css2?...&display=swap"
      as="style" onload="this.onload=null;this.rel='stylesheet'"/>
<noscript><link rel="stylesheet" href="..."/></noscript>
```

`display=swap` IS in the URL — so Google Fonts serves `font-display: swap`. The preload + onload trick makes it async. This is the correct pattern. [VERIFIED: direct read of index.html line 23]

Remaining risk: Material Symbols Outlined is loaded alongside Inter/Sora/Space Grotesk in a single URL — this is a large font variant request (`wght,FILL@100..700,0..1` is a variable axis range). This slows the overall font response even though it is async.

### Splash Screen Inline Script (VERIFIED from index.html lines 1001-1103)

The splash init script at line 1001 runs **synchronously** as an inline `<script>` in the body. It:
- Creates 9 DOM stripe elements programmatically
- Starts a `setInterval` at 160ms interval (runs for up to 5000ms during load)
- Registers two `setTimeout` callbacks

The `setInterval` at 160ms fires approximately 31 times during the minimum 5-second splash window. Each iteration modifies DOM (`bar.style.transform`, `tag.textContent`), forcing style recalculations. This is a **direct contributor** to the 2,427ms style & layout thrash reported in prior Lighthouse runs.

The script itself is NOT render-blocking (it is in `<body>`, not `<head>`), but its `setInterval` callbacks compete with the main thread during module evaluation.

---

## Standard Stack

### Core (No New Dependencies Required)

All optimizations in this phase can be done with existing tools.

| Tool | Version | Purpose |
|------|---------|---------|
| `tailwindcss` CLI | 3.4.4 (installed) | Re-run `build:css` after any input.css changes |
| Browser native SW API | — | Upgrade SW cache strategy |
| `netlify.toml` | — | Add HTTP cache headers for JS files |

### Supabase JS — Self-Hosting Strategy

**Do NOT use:** `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm`

Reason: jsDelivr's `+esm` rewrite is **broken for supabase-js v2**. Multiple supabase sub-packages (`@supabase/auth-js`, `@supabase/functions-js`) export `default null` and expose APIs only via named exports. jsDelivr's rewrite converts these to default imports, causing runtime errors like "Cannot read properties of null (reading 'AuthClient')". This bug was reported December 2025 and is unresolved. [VERIFIED: github.com/orgs/supabase/discussions/41118]

**Recommended:** Download the UMD bundle from jsDelivr and self-host it:

```bash
# In project root
mkdir -p vendor
curl -o vendor/supabase.min.js \
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.3/dist/umd/supabase.js"
```

Then update `index.html`:
```html
<!-- Before (external CDN) -->
<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- After (self-hosted) -->
<script defer src="./vendor/supabase.min.js"></script>
```

**Why self-hosting over ESM import:** The current code uses `window.supabase.createClient(...)` in `supabase_config.js`. This requires the UMD global export (`window.supabase`). ESM imports would require refactoring `supabase_config.js` to use `import { createClient } from '...'` and then re-export `window.sbClient`. That is possible but out of scope — self-hosting the UMD is a drop-in replacement.

**UMD file facts:** [VERIFIED: cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.3/dist/umd/]
- `supabase.js` (unminified UMD) = 192.44 KB
- No minified variant in the `/dist/umd/` directory (the file is already transpiled)
- Netlify will gzip-compress it on delivery automatically (expected ~45-55 KB gzipped)

**Version pinning:** Pin to `@2.105.3` (current as of 2026-05-05) in the filename to allow future updates to be a deliberate choice.

---

## Architecture Patterns

### Recommended Project Structure (Post-Phase)

```
windson_pwa/
├── vendor/
│   └── supabase.min.js      # self-hosted Supabase UMD (new)
├── dist/
│   └── style.css            # Tailwind compiled (existing)
├── src/
│   ├── css/
│   │   └── input.css        # Tailwind source (existing)
│   ├── modules/             # (existing, unchanged)
│   └── services/            # (existing, unchanged)
├── sw.js                    # service worker (strategy upgrade)
├── netlify.toml             # add JS cache headers
└── index.html               # inline critical CSS, update Supabase script tag
```

### Pattern 1: Critical CSS Inline

**What:** Extract the CSS rules needed to render the visible splash screen and header before external CSS loads. Inline them in a `<style>` block in `<head>`. Load the full `dist/style.css` asynchronously.

**When to use:** When a render-blocking CSS file is loading content that is visible at paint time.

**What qualifies as "critical" for this app:**
- `#windson-splash` and all `#splash-*` rules (splash screen is the first visible content)
- `body` background color (`#050808`) — prevents white flash
- `:root` CSS variables (needed by splash styles)
- `@keyframes` for splash animations

**What does NOT need to be critical:**
- Tab section styles (all hidden on load)
- `.glass-panel`, `.nav-btn`, etc. (not visible before auth)
- Tailwind utilities for tabs (not visible at FCP time)

**Estimated critical CSS size:** ~3 KB (the splash + body + root vars rules from `input.css`)

**Risk:** The full 44.8 KB `dist/style.css` must be loaded async. Use the same `preload + onload` pattern already used for Google Fonts:
```html
<link rel="preload" href="./dist/style.css" as="style" onload="this.onload=null;this.rel='stylesheet'"/>
<noscript><link rel="stylesheet" href="./dist/style.css"/></noscript>
```

**FOUC risk:** The app is behind an auth wall. Users see only the splash screen before CSS loads. The splash screen critical CSS covers everything visible. The main app UI only appears after auth completes — by which time the async CSS will have loaded. FOUC risk is effectively zero for this use case.

[CITED: web.dev/articles/optimize-lcp — "inline small stylesheets or reduce their size"]

### Pattern 2: Service Worker Stale-While-Revalidate for JS

**What:** Replace the network-first strategy for local JS files with stale-while-revalidate. This serves cached JS immediately on repeat visits while fetching an update in the background.

**Current problem:** Every visit downloads all JS files from the network (`network-first`), ignoring the browser cache. With no HTTP cache headers on JS files, this is always a full round-trip.

**Recommended SW strategy:**

```javascript
// sw.js — replace the isCode block

const isLocalJS = url.origin === location.origin &&
  (url.pathname.endsWith('.js') || url.pathname === '/');

if (isLocalJS && url.pathname !== '/sw.js') {
  // Stale-while-revalidate: serve cache immediately, update in background
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
        return cached || networkFetch;
      })
    )
  );
  return;
}
```

**Why not cache-first for JS?** Cache-first would serve stale JS indefinitely until the SW version changes. Stale-while-revalidate serves stale immediately but refreshes in the background — better balance of speed and freshness.

**CACHE_NAME bump:** When changing SW strategy, increment CACHE_NAME to `windson-pt-v7` to force all clients to re-install with the new strategy.

[CITED: web.dev/learn/pwa/workbox — stale-while-revalidate pattern]

### Pattern 3: content-visibility for Inactive Tabs

**What:** Add `content-visibility: hidden` to inactive tab sections, replacing the current CSS `display: none` for non-active tabs.

**Current code (`input.css` line 117-118):**
```css
.tab-section { display: none; }
.tab-section.active { display: block; }
```

**Problem:** `display: none` removes elements from layout but the browser still parses and styles all 755 DOM nodes at load time.

**Upgrade:**
```css
.tab-section {
  content-visibility: hidden;
  display: block; /* keep in layout flow for tab switching */
}
.tab-section.active {
  content-visibility: visible;
}
```

**`content-visibility: hidden` vs `display: none`:**
- `hidden`: browser skips rendering but **preserves cached layout state** — tab switching is instant
- `display: none`: full layout recalc on each show/hide
- Unlike `content-visibility: auto`, `hidden` does NOT render off-screen content at all

**Browser support:** `content-visibility` is supported in all modern browsers (Chrome 85+, Firefox 124+, Safari 18+). Since September 2024, it is Baseline. [CITED: MDN Web Docs — content-visibility]

**Lighthouse impact:** Reduces style & layout work at initial load. The 2,427ms style+layout thrash is partly caused by the browser computing layout for all tabs. `content-visibility: hidden` skips this work for off-screen tabs.

**Gotcha:** `content-visibility: hidden` does not hide the element (it still occupies space). Combined with `display: block` (keeping it in flow but hidden), this replaces `display: none`. The `display: block` on `.tab-section` should NOT interfere because the main element height will be zero by default if content is not rendered, unless `contain-intrinsic-size` is set. Test visually to confirm no layout shifts.

**Simpler alternative (lower risk):** If `content-visibility` causes layout issues, use `visibility: hidden; position: absolute; inset: 0; pointer-events: none;` for inactive tabs and `visibility: visible; position: static;` for active. This is less impactful but safer.

### Pattern 4: Netlify JS Cache Headers

Add to `netlify.toml`:

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

**Rationale:**
- `src/**`: 1-day cache with 7-day stale window. JS modules change infrequently; 24h cache reduces re-downloads dramatically.
- `vendor/**`: 30-day cache with `immutable`. The Supabase UMD will not change without a filename update.
- `config.js`: `no-cache` — contains API keys; always re-verify.
- `supabase_config.js`: 1-day cache — depends on `config.js` being fresh anyway.

[CITED: Netlify docs — caching-overview; docs.netlify.com/build/caching]

### Anti-Patterns to Avoid

- **Do NOT use `cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm`**: Known runtime breakage (null export bug). [VERIFIED: github.com/orgs/supabase/discussions/41118]
- **Do NOT inline all 44.8 KB of `dist/style.css`**: Inlining large CSS increases HTML payload and prevents browser caching of the stylesheet.
- **Do NOT use `display: none` for tab hiding and `content-visibility` simultaneously**: Pick one approach.
- **Do NOT cache `config.js` aggressively**: It contains API keys and should always be fresh.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Critical CSS extraction | Manual grep through CSS | Maintain a dedicated `<style>` block in index.html with splash rules | This codebase has no bundler. Manual extraction is a one-time 15-min task for ~3 KB of styles |
| SW caching library | Custom cache logic | Upgrade existing sw.js patterns (no Workbox needed) | Project has no npm build step for JS; Workbox would require bundler |
| Font subsetting | Custom font server | Use `display=swap` + current async preload (already done) | Material Symbols variable font is the bottleneck; subsetting requires self-hosting |

---

## Common Pitfalls

### Pitfall 1: Supabase CDN `+esm` Runtime Failure

**What goes wrong:** Using `cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm` causes silent runtime failure — `window.supabase` is undefined, auth never initializes, app shows blank screen.

**Why it happens:** jsDelivr's ESM rewrite uses default imports for packages that export `default null` (like `@supabase/auth-js`). The imported value is `null`, so `createClient` is unreachable. [VERIFIED: github.com/orgs/supabase/discussions/41118]

**How to avoid:** Self-host the UMD bundle. Do NOT use jsDelivr `+esm`.

**Warning signs:** `TypeError: Cannot read properties of null (reading 'AuthClient')` in console.

### Pitfall 2: FOUC When Loading CSS Async

**What goes wrong:** If full `dist/style.css` is made async without inlining critical CSS, users see unstyled content (raw black background, no Tailwind classes applied) for 1-3 seconds.

**Why it happens:** The app shell (header, tabs, nav) depends on Tailwind classes defined in `dist/style.css`. Making CSS async without inlining critical styles breaks the visual chain.

**How to avoid:** Inline ALL styles needed for the splash screen + body background before making `dist/style.css` async. The splash screen is the only visible element during load; main app content requires auth first, by which time async CSS has loaded.

**Warning signs:** Black background with unstyled text during load, or splash screen appearing without any animation/colors.

### Pitfall 3: Service Worker Version Not Bumped

**What goes wrong:** After updating `sw.js` strategy, existing users continue using the cached old SW. The new stale-while-revalidate logic never takes effect.

**Why it happens:** Browsers cache the SW itself. A new SW is only activated when the file content changes and the old SW's lifecycle completes (`skipWaiting()` + `claim()`).

**How to avoid:** Change `CACHE_NAME` from `'windson-pt-v6'` to `'windson-pt-v7'` whenever strategy changes. The existing `skipWaiting()` and `clients.claim()` calls in the activate handler are already correct.

### Pitfall 4: `content-visibility: hidden` Height Collapse

**What goes wrong:** Inactive tabs collapse to zero height if `contain-intrinsic-size` is not set, causing the page to resize when switching tabs.

**Why it happens:** `content-visibility: hidden` prevents layout calculation, so the browser assumes 0px height for the element.

**How to avoid:** Since tabs are `display: none` currently (which also collapses height), switching to `content-visibility: hidden` with `display: block` may cause the page to show ghost space. Test with `display: none` kept for inactive tabs, and use `content-visibility: auto` ONLY for the active tab's sections/panels. This is the lower-risk approach.

**Lower-risk alternative:** Apply `content-visibility: auto` only to long sections within the active tab (e.g., the exercise bank list, the client grid), not to whole tabs.

### Pitfall 5: Splash Screen `setInterval` Leaking

**What goes wrong:** If `exitSplash()` fails to fire (e.g., due to an error in module loading), the `setInterval` at 160ms runs indefinitely, consuming main thread budget and causing ongoing layout thrash.

**Why it happens:** The 5000ms fallback `setTimeout(exitSplash, 5000)` is the only safety net, and it's already there. But if the DOM is removed before the interval clears, it still fires.

**How to avoid:** The fallback at line 1100 is correct. Add `clearInterval(progressInterval)` in the `exitSplash()` function (it IS already there at line 1064 — verified). No change needed; document as-is.

### Pitfall 6: Google Fonts URL Without `display` Parameter

**What goes wrong:** Font text is invisible during load (FOIT) if `font-display: swap` is not specified.

**Why it doesn't apply here:** Current URL already includes `&display=swap`. [VERIFIED: index.html line 23]

---

## Code Examples

### Critical CSS Extraction (Splash + Body)

Extract these rules from `input.css` into a `<style>` block in `<head>` (before the async CSS `preload` link):

```html
<!-- Source: src/css/input.css — splash + body critical rules only -->
<style>
/* Critical: body background prevents white flash */
*, *::before, *::after { box-sizing: border-box; }
body {
  font-family: 'Inter', sans-serif;
  background-color: #050808;
  color: rgba(255,255,255,0.95);
  min-height: max(884px, 100dvh);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  margin: 0;
}
/* Critical: CSS variables used by splash */
:root {
  --bg-deep: #050808;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
/* Critical: splash screen */
#windson-splash { position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;background:#040404;overflow:hidden; }
/* ... (all #splash-* rules from input.css) ... */
/* Critical: animation keyframes used by splash */
@keyframes splashLogoIn { ... }
@keyframes splashStripesIn { ... }
@keyframes stripeFlow { ... }
@keyframes iconPulse { ... }
@keyframes splashExit { ... }
</style>

<!-- Full CSS loaded async (non-blocking) -->
<link rel="preload" href="./dist/style.css" as="style"
      onload="this.onload=null;this.rel='stylesheet'"/>
<noscript><link rel="stylesheet" href="./dist/style.css"/></noscript>
```

[ASSUMED] — The exact extracted CSS will need manual copy from `input.css` splash section (lines 235-393). Estimated size: ~3 KB.

### Self-Hosted Supabase — HTML Change

```html
<!-- Before -->
<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- After (self-hosted UMD, version pinned, deferred) -->
<script defer src="./vendor/supabase.js"></script>
```

No changes to `supabase_config.js` — `window.supabase.createClient()` still works with UMD. [VERIFIED: UMD format exposes `window.supabase` global]

### SW Stale-While-Revalidate for JS

```javascript
// sw.js — complete revised fetch handler
const CACHE_NAME = 'windson-pt-v7'; // bump from v6

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // External (CDN, fonts, Supabase API): network-first, cache fallback
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // SW itself: never intercept
  if (url.pathname.endsWith('sw.js')) {
    return;
  }

  // HTML: network-first (must stay fresh for SW lifecycle)
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

  // JS files: stale-while-revalidate
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

  // CSS, images, icons: cache-first
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

---

## Estimated Lighthouse Impact by Intervention

These estimates are based on documented Lighthouse scoring mechanisms. They are approximate.
[ASSUMED] — No real Lighthouse run was performed during this research session.

| # | Intervention | Metric Affected | Estimated Point Gain | Confidence |
|---|-------------|----------------|---------------------|------------|
| 1 | Self-host Supabase JS (eliminate CDN RTT) | FCP, LCP, TBT | +5-8 pts | MEDIUM |
| 2 | Inline critical CSS + async full CSS | FCP, LCP | +6-10 pts | MEDIUM |
| 3 | SW stale-while-revalidate + JS cache headers | Repeat visit score | +3-5 pts (repeat) | MEDIUM |
| 4 | `content-visibility: hidden` for inactive tabs | TBT, main thread | +2-4 pts | LOW-MEDIUM |
| 5 | Material Symbols font: narrow axis range | LCP, FCP | +1-2 pts | LOW |
| **Total** | | | **+17-29 pts** | MEDIUM |

Target: current 52 + 17-29 = **69-81**. The ≥ 80 target is achievable but requires interventions 1 and 2 both succeeding. If either underperforms, intervention 4 becomes critical.

---

## Recommended Execution Order (Highest Impact First)

### Wave 0 — Preparation (no behavior change)
1. Download and commit `vendor/supabase.js` (UMD, v2.105.3)
2. Bump SW `CACHE_NAME` to `windson-pt-v7`

### Wave 1 — Render Unblocking (biggest FCP/LCP wins)
3. Update `index.html`: `<script defer src="./vendor/supabase.js">` (replaces CDN)
4. Extract critical CSS from `input.css` splash section into `<style>` in `<head>`
5. Make `dist/style.css` async: change `<link rel="stylesheet">` to preload+onload pattern
6. **Lighthouse check** after Wave 1 to measure actual gains before continuing

### Wave 2 — Caching & Repeat Visit
7. Update `sw.js` with stale-while-revalidate for JS (+ CACHE_NAME bump)
8. Add `netlify.toml` cache headers for `/src/**`, `/vendor/**`
9. Add `netlify.toml` headers for `index.html` itself: `Cache-Control: no-cache` (this is the Netlify default; document explicitly)

### Wave 3 — Main Thread & DOM
10. Apply `content-visibility: hidden/visible` to tab sections (or decide on lower-risk alternative)
11. Consider narrowing Material Symbols font axis: `wght@400` only instead of `wght,FILL@100..700,0..1`

### Wave 4 — Validation
12. Run Lighthouse mobile (3 times, take median score)
13. Verify app works: auth flow, tab switching, Supabase operations, SW install/update cycle

---

## Open Questions

1. **Material Symbols font subsetting**
   - What we know: The current URL requests the full variable font range (`wght,FILL@100..700,0..1`). This is a large request even when async.
   - What's unclear: Which specific icon weights and fill values are actually used in the app. A quick grep of `class="material-symbols-outlined"` would reveal usage.
   - Recommendation: Defer to Wave 3. Grep for actual icon usage before narrowing the axis range.

2. **content-visibility browser behavior in this specific app**
   - What we know: `content-visibility: hidden` skips rendering of hidden tabs. Tab switching calls `.classList.add('active')` on the target section.
   - What's unclear: Whether changing from `display: none` to `content-visibility: hidden` affects the stagger observer (`IntersectionObserver` in ui.js) which monitors `.stagger-item` elements inside tabs.
   - Recommendation: Test locally. The `staggerObserver.observe(el)` call in `_activateTab()` already handles re-observation when a tab becomes active — should work fine.

3. **index.html size (98.7 KB)**
   - What we know: `index.html` is large because all 6 tabs plus all modals are inline HTML.
   - What's unclear: Whether splitting tabs into separate fetch-on-demand HTML fragments would be beneficial.
   - Recommendation: Out of scope for this phase. The current approach keeps the app working offline via SW cache. Splitting would require refactoring the tab system. Document as future optimization.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Tailwind CSS build | Yes (confirmed — npm in use) | 18+ | — |
| `tailwindcss` CLI | CSS rebuild if input.css changes | Yes (in devDependencies) | 3.4.4 | — |
| `curl` or browser download | Fetch Supabase UMD | Yes | — | Download via browser, commit manually |
| Netlify CDN | Serving headers | Yes (production host) | — | — |
| Browser DevTools | Lighthouse runs | Yes | — | PageSpeed Insights online |

**No missing dependencies.** All changes are file edits + one file download.

---

## Validation Architecture

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated? |
|-----|----------|-----------|------------|
| LCP/FCP improvement | Lighthouse mobile score ≥ 80 | Manual (Lighthouse) | No — run DevTools > Lighthouse |
| Supabase auth works | Login with Google completes | Manual smoke test | No |
| SW caches JS | Repeat visit uses cached JS | Manual (DevTools > Network > disable net) | No |
| Tab switching works | Each tab renders correctly | Manual smoke test | No |
| Critical CSS correct | Splash renders without full CSS loaded | Manual (DevTools > block dist/style.css) | No |
| Fonts still load | Inter, Sora, Space Grotesk visible after load | Visual inspection | No |

### Quick validation command (CSS rebuild)
```bash
npm run build:css
```

### Per-wave validation checklist
- Wave 1: DevTools > Network > check `dist/style.css` is now preload not render-blocking; Lighthouse run
- Wave 2: DevTools > Application > Service Workers > check new v7 activated; Network tab shows 304/cache hits for JS
- Wave 3: DevTools > Elements > inspect inactive tab sections for `content-visibility` property

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No change in this phase | Supabase OAuth unchanged |
| V5 Input Validation | No change | No new user inputs |
| V6 Cryptography | No change | API keys not modified |

**Security note on self-hosting Supabase JS:** The vendor file is a client-side library. It does not increase attack surface beyond what the CDN version provides. Pinning to a specific version (`2.105.3`) avoids supply-chain attacks from unpinned CDN URLs (e.g., `@supabase/supabase-js@2` without version pin). [ASSUMED] — SRI (Subresource Integrity) hash for the vendor file is not required by project conventions, but could be added for defense-in-depth.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Lighthouse score gain estimates (+17-29 pts total) | Estimated Impact table | Could be lower; actual gains depend on network simulation used in Lighthouse mobile throttle |
| A2 | Critical CSS extraction is ~3 KB | Pattern 1 | Could be larger; exact size depends on which keyframes are included. Over 14 KB inlined CSS would be counterproductive |
| A3 | SRI not required for vendor file | Security Domain | If SRI is company policy, a hash would need to be computed after download |
| A4 | `content-visibility: hidden` does not break IntersectionObserver on tab switch | Pitfall 4 | If stagger animations stop working after tab switch, revert to display:none approach |
| A5 | Netlify default cache for JS files is `max-age=0, must-revalidate` | Cache Header Gap | If Netlify changed default, the urgency of adding JS cache headers may differ |

---

## Sources

### Primary (HIGH confidence)
- Direct file reads: `index.html`, `sw.js`, `src/css/input.css`, `src/main.js`, `src/services/supabaseService.js`, `src/modules/auth.js`, `netlify.toml`, `supabase_config.js`, `config.js`, `.planning/codebase/*.md` — all code facts are VERIFIED
- [cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.3/dist/umd/](https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.3/dist/umd/) — UMD file size 192.44 KB [VERIFIED]
- [cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm](https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm) — Confirmed ESM bundle is available via jsDelivr [VERIFIED]
- [developer.chrome.com/docs/lighthouse/performance/render-blocking-resources](https://developer.chrome.com/docs/lighthouse/performance/render-blocking-resources) — Scripts with `defer` do not block rendering [CITED]
- [developer.chrome.com/docs/lighthouse/performance/dom-size](https://developer.chrome.com/docs/lighthouse/performance/dom-size) — Warning at >800 nodes, error at >1,400 [CITED]
- [developer.chrome.com/docs/lighthouse/performance/mainthread-work-breakdown](https://developer.chrome.com/docs/lighthouse/performance/mainthread-work-breakdown) — Main thread flagged >4s; categories include style+layout [CITED]

### Secondary (MEDIUM confidence)
- [github.com/orgs/supabase/discussions/41118](https://github.com/orgs/supabase/discussions/41118) — jsDelivr `+esm` breaks supabase-js v2; esm.sh as workaround [VERIFIED via WebFetch]
- [web.dev/articles/optimize-lcp](https://web.dev/articles/optimize-lcp) — Inline critical CSS, font-display recommendations [CITED]
- [MDN — content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility) — `hidden` vs `auto` behavior [CITED]
- [web.dev/learn/pwa/workbox](https://web.dev/learn/pwa/workbox) — Stale-while-revalidate strategy [CITED]
- [docs.netlify.com/build/caching/caching-overview](https://docs.netlify.com/build/caching/caching-overview/) — Netlify default headers and cache configuration [CITED]

### Tertiary (LOW confidence)
- Lighthouse score gain estimates are derived from industry averages reported in web performance case studies, not from a real Lighthouse run on this project.

---

## Metadata

**Confidence breakdown:**
- Current state assessment: HIGH — all facts read directly from source files
- Supabase CDN strategy: HIGH — jsDelivr +esm bug verified in GitHub discussion
- CSS critical path: MEDIUM — specific CSS to extract identified, but exact size is estimated
- Lighthouse impact estimates: LOW — projections based on general guidance, not real measurement
- SW strategy: HIGH — patterns are well-established and match current codebase structure

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (30 days; Lighthouse scoring algorithm and Supabase CDN behavior are stable)
