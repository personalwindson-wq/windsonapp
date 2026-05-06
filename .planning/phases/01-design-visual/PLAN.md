---
phase: 01-design-visual
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/css/input.css
  - src/modules/exerciseBank.js
  - src/services/supabaseService.js
  - index.html
  - src/assets/img/treino.jpg
  - src/assets/img/postural.jpg
  - src/assets/img/clientes.jpg
  - src/assets/img/volume.jpg
autonomous: true
requirements:
  - VISUAL-01
  - VISUAL-02
  - VISUAL-03

must_haves:
  truths:
    - "Exercise descriptions longer than 150 chars are truncated to 3 lines; a gold 'ver mais' button appears below them"
    - "Tapping 'ver mais' expands the full description and changes the button text to 'ver menos'"
    - "Dashboard agenda cards animate in sequentially on load — each card fades up with 80ms stagger delay"
    - "The 4 quick-action buttons (Clientes, Avaliação Postural, Treinos, Volume Semanal) display a dark fitness photo background with visible text on top"
    - "All existing functionality continues to work — navigation, data loading, exercise filters, WhatsApp, modals"
  artifacts:
    - path: "src/css/input.css"
      provides: ".desc-clamp, @keyframes agendaIn, .agenda-card-enter, .quick-btn CSS classes"
      contains: "desc-clamp"
    - path: "src/modules/exerciseBank.js"
      provides: "truncated description rendering with ver mais toggle"
      contains: "desc-clamp"
    - path: "src/services/supabaseService.js"
      provides: "stagger animation applied to dashboard agenda cards after render"
      contains: "agenda-card-enter"
    - path: "src/assets/img/treino.jpg"
      provides: "fitness photo for Treinos button background"
    - path: "src/assets/img/postural.jpg"
      provides: "fitness photo for Avaliação Postural button background"
    - path: "src/assets/img/clientes.jpg"
      provides: "fitness photo for Clientes button background"
    - path: "src/assets/img/volume.jpg"
      provides: "fitness photo for Volume Semanal button background"
  key_links:
    - from: "src/modules/exerciseBank.js renderExerciseCard()"
      to: "src/css/input.css .desc-clamp"
      via: "class applied to description wrapper div"
      pattern: "desc-clamp"
    - from: "src/services/supabaseService.js fetchDashboard()"
      to: "src/css/input.css @keyframes agendaIn"
      via: "agenda-card-enter class + inline animation-delay set after innerHTML build"
      pattern: "agenda-card-enter"
    - from: "index.html quick-action buttons"
      to: "src/assets/img/*.jpg"
      via: "CSS background-image via .quick-btn class or inline style"
      pattern: "quick-btn"
---

<objective>
Implement three targeted visual improvements to the Windson Personal Trainer PWA dashboard and exercise bank. No redesign — only additive CSS and minimal JS changes to existing render functions.

Purpose: Make the app feel more premium without touching any data logic, routing, or business rules.
Output: Three visual features ship as atomic edits to four existing files plus four new image assets.
</objective>

<execution_context>
@D:\PROJETOS\APLICATIVOS\windson_pwa-20260504T180459Z-3-001\windson_pwa\.planning\phases\01-design-visual\01-CONTEXT.md
</execution_context>

<context>
Key files to edit (read each before modifying):
- `src/css/input.css` — Tailwind + custom CSS. All new classes go here, after the existing `.stagger-show` block (line ~77).
- `src/modules/exerciseBank.js` — `renderExerciseCard()` function (lines 64–131) generates card HTML. The `instructionsBlock` pattern (lines 92–104) shows the existing inline-toggle pattern to follow.
- `src/services/supabaseService.js` — `fetchDashboard()` function (lines 131–187) writes agenda card HTML to `#dashboard-agenda-list`. The stagger hook goes at the end of this function, after `el.innerHTML` is fully assembled.
- `index.html` — Quick-action buttons at lines 201–259. Each is a `<button class="glass-panel rounded-[32px] p-8 ...">` with `relative overflow-hidden`. The overlay divs are already inside; the pattern for Avaliação (line 215–216) shows a background-image + overlay already in use.

<interfaces>
<!-- Existing patterns to follow. No exploration needed. -->

From src/modules/exerciseBank.js — existing inline toggle pattern (instructions block):
```js
// Toggle pattern already in use — mirror this for ver mais:
`<div id="${cardId}-inst" style="display:none;" class="mt-1 flex flex-col gap-2">...</div>
 <button onclick="(function(el,btn){const open=el.style.display==='none';el.style.display=open?'block':'none';btn.textContent=open?'Ocultar instruções':'Ver instruções';})(document.getElementById('${cardId}-inst'),this)"
         class="mt-1 text-[10px] font-medium"
         style="color:rgba(212,175,55,0.7);text-align:left;">Ver instruções</button>`
```

From src/css/input.css — existing stagger pattern to extend:
```css
.stagger-item { opacity: 0; transform: translateY(20px); transition: opacity 0.6s var(--ease-out), transform 0.6s var(--ease-out); }
.stagger-show { opacity: 1; transform: translateY(0); }
/* New keyframe animation (.agenda-card-enter) will live next to these */
```

From src/services/supabaseService.js — render loop to hook into:
```js
// fetchDashboard() ends at line 187. After data.forEach(ag => { ... }):
// el.innerHTML is fully built — safe to query children and apply animation classes.
el.querySelectorAll('.agenda-card-item').forEach((card, i) => {
  card.classList.add('agenda-card-enter');
  card.style.animationDelay = `${i * 80}ms`;
});
// NOTE: the agenda item divs currently have no class. Add class="agenda-card-item" to the div in the data.forEach template string.
```

From index.html — existing Avaliação button background pattern (line 215-216):
```html
<!-- Already uses background-image + overlay. Replicate for all 4 buttons. -->
<div class="absolute inset-0 bg-[url('...')] bg-cover bg-center opacity-10 mix-blend-luminosity"></div>
<div class="absolute inset-0 bg-gradient-to-t from-surface-variant/90 to-transparent"></div>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1 — CSS: add desc-clamp, agendaIn keyframe, agenda-card-enter, and quick-btn classes</name>
  <files>src/css/input.css</files>
  <action>
Open src/css/input.css. After the `.stagger-show` block (around line 77), insert the following four new rule blocks. Do not modify any existing rules.

**Block 1 — Description truncation:**
```css
/* Exercise description — 3-line clamp with toggle */
.desc-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

**Block 2 — Agenda entrance keyframe:**
```css
/* Dashboard agenda card stagger entrance */
@keyframes agendaIn {
  0%   { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
}
.agenda-card-enter {
  animation: agendaIn 400ms ease-out both;
}
```

**Block 3 — Quick-action button overlay pattern:**
```css
/* Quick-action buttons: fitness photo background with dark overlay */
.quick-btn {
  position: relative;
  overflow: hidden;
}
.quick-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 0;
}
.quick-btn > * {
  position: relative;
  z-index: 1;
}
```

No other changes to input.css. Do not touch existing rules.
  </action>
  <verify>
Search input.css for all three new identifiers:
- grep for "desc-clamp" → must appear
- grep for "agendaIn" → must appear
- grep for "quick-btn" → must appear
- Open the file and visually confirm no existing rules were altered (`.stagger-item`, `.nav-btn`, `.ex-filter-btn` blocks must be intact)
  </verify>
  <done>input.css has three new blocks appended after .stagger-show. No existing rules changed. File is valid CSS (no unclosed braces).</done>
</task>

<task type="auto">
  <name>Task 2 — exerciseBank.js: truncate description with "ver mais" toggle</name>
  <files>src/modules/exerciseBank.js</files>
  <action>
Open src/modules/exerciseBank.js. Inside `renderExerciseCard(ex)`, locate the `instructionsBlock` declaration (line ~92). Immediately before it, add a `descriptionBlock` variable using the same inline-toggle pattern already used for instructions.

**Add this variable (insert before the `instructionsBlock` const):**
```js
const rawDesc = Array.isArray(ex.instructions) && ex.instructions.length
  ? ex.instructions.join(' ')
  : '';
const descBlock = rawDesc.length > 150
  ? (() => {
      const descId = cardId + '-desc';
      return `<div>
        <p id="${descId}" class="desc-clamp text-[11px] leading-relaxed" style="color:#aaa;">${rawDesc}</p>
        <button onclick="(function(el,btn){const clamped=el.classList.contains('desc-clamp');el.classList.toggle('desc-clamp',!clamped);btn.textContent=clamped?'ver menos':'ver mais';})(document.getElementById('${descId}'),this)"
                class="mt-1 text-sm font-medium"
                style="color:#D4AF37;text-align:left;">ver mais</button>
      </div>`;
    })()
  : rawDesc.length > 0
    ? `<p class="text-[11px] leading-relaxed" style="color:#aaa;">${rawDesc}</p>`
    : '';
```

**Then insert `${descBlock}` into the card HTML** inside the `<div class="flex flex-col gap-2 p-4 flex-grow">` section, between the badges row and the `${instructionsBlock}`. The exact insertion point in the return template string is after the closing `</div>` of the flex badges row and before `${instructionsBlock}`.

The card body section should read:
```html
<div class="flex flex-col gap-2 p-4 flex-grow">
  <h3 ...>${name}</h3>
  <div class="flex gap-1.5 flex-wrap">
    ...badges...
    ${levelBadge}
  </div>
  ${descBlock}
  ${instructionsBlock}
  <button ...>Incluir no Protocolo</button>
</div>
```

No other changes to exerciseBank.js. Do not change any function signatures, exports, or the `instructionsBlock` logic.
  </action>
  <verify>
- grep for "desc-clamp" in exerciseBank.js → must appear
- grep for "ver mais" in exerciseBank.js → must appear
- grep for "descBlock" in exerciseBank.js → must appear
- Open the app in a browser (or inspect the rendered HTML), navigate to Banco de Exercícios, filter any muscle group. Cards with long descriptions must show truncated text + gold "ver mais" link. Tapping "ver mais" expands the text and changes to "ver menos". Tapping again collapses.
- The "Incluir no Protocolo" button must still work (adds exercise to workout builder).
  </verify>
  <done>Exercise cards with descriptions > 150 chars display 3-line truncation and a gold "ver mais" toggle. Cards with short descriptions display normally. "Incluir no Protocolo" unaffected.</done>
</task>

<task type="auto">
  <name>Task 3 — supabaseService.js: apply stagger animation to dashboard agenda cards</name>
  <files>src/services/supabaseService.js</files>
  <action>
Open src/services/supabaseService.js. Find the `fetchDashboard()` function (lines ~131–187).

**Step 1:** Inside the `data.forEach(ag => { ... })` loop, add the class `agenda-card-item` to the outermost `<div>` of each agenda card. Change:
```js
el.innerHTML += `
  <div class="flex items-center gap-4 p-4 hover:bg-white/5 ...">
```
to:
```js
el.innerHTML += `
  <div class="agenda-card-item flex items-center gap-4 p-4 hover:bg-white/5 ...">
```

**Step 2:** After the `data.forEach` loop closes (after the closing `});`), add the stagger animation hook:
```js
// Apply stagger entrance animation to agenda cards
requestAnimationFrame(() => {
  el.querySelectorAll('.agenda-card-item').forEach((card, i) => {
    card.classList.add('agenda-card-enter');
    card.style.animationDelay = `${i * 80}ms`;
  });
});
```

The `requestAnimationFrame` ensures the DOM is painted before animation classes are applied, preventing the animation from being skipped on fast renders.

No other changes to supabaseService.js.
  </action>
  <verify>
- grep for "agenda-card-item" in supabaseService.js → must appear twice (in the template string and in querySelectorAll)
- grep for "agenda-card-enter" in supabaseService.js → must appear
- grep for "animationDelay" in supabaseService.js → must appear
- Open the app in a browser. Reload the dashboard. Agenda cards must appear one by one with a visible fade+slide-up stagger (not all at once).
- Navigate away and back to dashboard. Cards re-animate on each load.
  </verify>
  <done>Dashboard agenda cards animate in sequentially with 80ms stagger delay and 400ms ease-out fade+slide-up. Static placeholder cards in index.html are unaffected (they do not have the agenda-card-item class).</done>
</task>

<task type="checkpoint:human-action">
  <name>Task 4 — Download 4 fitness photos from Unsplash (human step)</name>
  <what-built>CSS classes for quick-action button backgrounds are ready (Task 1). The next task will wire them. This step provides the image files.</what-built>
  <how-to-verify>
Create the directory `src/assets/img/` in the project root if it does not exist.

Download these 4 free Unsplash photos and save them to exact paths shown. Each must be under 50KB — use Squoosh (squoosh.app) or TinyJPG to compress if needed. Target: 800×600px, JPEG quality 70.

1. **Treinos** → save as `src/assets/img/treino.jpg`
   Suggested search: https://unsplash.com/s/photos/gym-weights-dark
   Example: Photo by Anastase Maragos (muscular person lifting weights, dark background)

2. **Avaliação Postural** → save as `src/assets/img/postural.jpg`
   Suggested search: https://unsplash.com/s/photos/posture-body-assessment
   Example: Photo showing silhouette or body assessment in studio

3. **Clientes** → save as `src/assets/img/clientes.jpg`
   Suggested search: https://unsplash.com/s/photos/personal-trainer-client
   Example: Trainer with client, gym environment

4. **Volume Semanal** → save as `src/assets/img/volume.jpg`
   Suggested search: https://unsplash.com/s/photos/barbell-plates-gym
   Example: Barbell plates, dark moody gym photo

All Unsplash photos are free for commercial use (Unsplash License). No attribution required, but you can add it in the app footer if desired.
  </how-to-verify>
  <resume-signal>Type "images ready" once all 4 files exist in src/assets/img/ and are under 50KB each.</resume-signal>
</task>

<task type="auto">
  <name>Task 5 — index.html: add photo backgrounds to quick-action buttons</name>
  <files>index.html</files>
  <action>
Open index.html. Find the four quick-action `<button>` elements in the dashboard section (lines ~201–259). They currently have classes like `glass-panel rounded-[32px] p-8 flex flex-col justify-between group h-64 relative overflow-hidden ...`.

For each button, make two changes:

**Change 1:** Add `quick-btn` to the button's class list (alongside existing classes — do not remove any).

**Change 2:** Add a background-image div as the first child inside the button (before all existing children). Use the same pattern already present on the Avaliação button (line 215), replacing the Unsplash CDN URL with a local path:

**Clientes button** (onclick="showTab('tab-clientes')"):
```html
<div class="absolute inset-0 bg-cover bg-center" style="background-image:url('src/assets/img/clientes.jpg');opacity:0.35;"></div>
```

**Avaliação Postural button** (onclick="showTab('tab-avaliacao')"):
Replace the existing `bg-[url('https://images.unsplash.com/...')]` div (line 215) with:
```html
<div class="absolute inset-0 bg-cover bg-center" style="background-image:url('src/assets/img/postural.jpg');opacity:0.35;"></div>
```
Keep the existing gradient overlay div (line 216) that is already there.

**Treinos button** (onclick="showTab('tab-treinos')"):
```html
<div class="absolute inset-0 bg-cover bg-center" style="background-image:url('src/assets/img/treino.jpg');opacity:0.35;"></div>
```

**Volume Semanal button** (onclick="showTab('tab-financeiro')"):
```html
<div class="absolute inset-0 bg-cover bg-center" style="background-image:url('src/assets/img/volume.jpg');opacity:0.35;"></div>
```

For all buttons: text, icons, and chart content must remain fully visible. All existing `z-10` children already lift above the overlay. The `.quick-btn::before` overlay (rgba 0,0,0,0.55) from Task 1 provides the darkening layer — do not add another manual overlay div unless the Avaliação button already has one (which it does; keep it).

Do not change any onclick handlers, text content, Tailwind utility classes, or child elements other than inserting the background-image div.
  </action>
  <verify>
- grep for "quick-btn" in index.html → must appear 4 times (once per button)
- grep for "clientes.jpg" in index.html → must appear
- grep for "treino.jpg" in index.html → must appear
- grep for "volume.jpg" in index.html → must appear
- Open the app in a browser. All 4 quick-action buttons must show a dark fitness photo background. Text and icons must be clearly readable (white/gold) on top of the overlay.
- Tap each button — navigation must work exactly as before.
  </verify>
  <done>All 4 quick-action buttons display a dark fitness photo background with rgba(0,0,0,0.55) overlay. Text/icons fully readable. Navigation unchanged.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| External images → local assets | Task 4 downloads images from Unsplash. Only image files land in src/assets/img/ — no executable content. |
| User input → card toggle | The "ver mais" button toggle uses DOM IDs generated from Math.random() — no user-supplied data in IDs. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | Downloaded JPEG files | accept | Files are display-only images served as static assets. No code execution path. Verify file extension and size before commit. |
| T-01-02 | Information Disclosure | exercise description text in DOM | accept | Descriptions come from Supabase and are already rendered in the existing instructionsBlock — no new exposure surface introduced. |
| T-01-03 | Denial of Service | animation on slow devices | accept | Animation uses only `opacity` + `transform` (GPU composited). No layout thrashing. `animation-fill-mode: both` prevents FOUC. Low risk. |
| T-01-04 | Spoofing | cardId collision in Math.random() | accept | IDs are for UI toggle only, not auth or data. Collision probability negligible for a single-user PT app. |
</threat_model>

<verification>
After all tasks complete, perform these end-to-end checks:

1. **Exercise truncation:** Open Banco de Exercícios tab. Filter "Chest". Find a card with a long description. Confirm 3-line truncation + gold "ver mais" link. Tap to expand. Tap "ver menos" to collapse. "Incluir no Protocolo" still adds exercise to workout builder.

2. **Agenda stagger:** Reload the app on the Dashboard tab. Watch the agenda cards — they must appear one by one with visible stagger (not all simultaneously). If no real appointments exist today, add a test appointment via the Agenda tab, then reload Dashboard.

3. **Quick-action backgrounds:** On the Dashboard, all 4 action buttons (Clientes, Avaliação Postural, Treinos, Volume Semanal) must show a dark fitness photo background. Text must be legible. Tap each — navigation must work.

4. **Regression check:** Run through every tab (Dashboard, Clientes, Avaliação, Treinos, Agenda, Financeiro). Confirm all data loads, modals open/close, WhatsApp buttons work, exercise bank filters work, agenda calendar works.
</verification>

<success_criteria>
- `.desc-clamp` CSS class exists in input.css and truncates exercise descriptions to 3 lines
- Gold "ver mais" / "ver menos" toggle works in exercise cards for descriptions > 150 chars
- Dashboard agenda cards stagger-animate on every load (400ms, 80ms delay between cards)
- All 4 quick-action buttons display dark fitness photo backgrounds with legible text
- Zero regressions: all tabs, modals, data features work exactly as before
- All 4 image files exist in src/assets/img/ and are under 50KB each
</success_criteria>

<output>
After all tasks complete, create `.planning/phases/01-design-visual/01-01-SUMMARY.md` with:
- What was changed in each file
- Any deviations from this plan (and why)
- Verification results for each task
- Screenshot notes or observations from the visual checkpoint
</output>
