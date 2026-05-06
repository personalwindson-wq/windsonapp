<!-- refreshed: 2026-05-04 -->
# Architecture

**Analysis Date:** 2026-05-04

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         index.html (SPA Entry)                       │
│   Loads: config.js → supabase_config.js → module scripts (sync)     │
│   Then: src/main.js (ES Module, deferred)                           │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Sync Scripts (window globals exposed)                              │
│  ├── src/data/avProto.js     → window.AV_PROTO                      │
│  ├── src/data/exEnMap.js     → window.AV_CONNS, window.EX_EN_MAP   │
│  ├── src/utils/geometry.js   → window.avCol, avSev, avDrawLine     │
│  └── src/services/rapidApiService.js → window.loadExGif            │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ES Module Imports (src/main.js:17-23)                              │
│  ├── src/modules/ui.js           → staggerObserver, showTab, etc.   │
│  ├── src/services/supabaseService.js → window.fetchClientes, etc.  │
│  ├── src/modules/auth.js         → init(), OAuth, session observer  │
│  ├── src/modules/exerciseBank.js → fetchExercises, render, WhatsApp │
│  └── src/modules/avaliacao.js   → MoveNet analysis pipeline         │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Auth | OAuth sign-in, email whitelist, session management | `src/modules/auth.js` |
| UI | Tab navigation, modal management, stagger animations | `src/modules/ui.js` |
| Supabase Service | All DB operations (clients, appointments, workouts, payments) | `src/services/supabaseService.js` |
| Exercise Bank | Exercise catalog, filtering, workout builder, WhatsApp sharing | `src/modules/exerciseBank.js` |
| Avaliacao (Assessment) | Postural analysis via MoveNet, angular measurements, protocol generation | `src/modules/avaliacao.js` |
| RapidAPI Service | Exercise GIF loading with local cache | `src/services/rapidApiService.js` |
| Geometry Utils | Color calculation, severity, canvas line drawing | `src/utils/geometry.js` |

## Pattern Overview

**Overall:** Vanilla JS Module Pattern with Global Window Exports

**Key Characteristics:**
- No build step for JS (ES Modules via `<script type="module">`)
- Global window object used extensively for inter-module communication
- Sync scripts load before module script to populate window globals
- Lazy loading for heavy dependencies (TensorFlow.js loaded on-demand)

## Layers

**Configuration Layer:**
- Purpose: Runtime config and Supabase initialization
- Location: `config.js`, `supabase_config.js`
- Contains: API keys, Supabase client instantiation
- Depends on: None
- Used by: All modules

**Data Layer:**
- Purpose: Static reference data (protocols, mappings)
- Location: `src/data/avProto.js`, `src/data/exEnMap.js`
- Contains: Corrective exercise protocols, PT→EN translation map
- Depends on: None
- Used by: `avaliacao.js`, `rapidApiService.js`

**Service Layer:**
- Purpose: External API communication
- Location: `src/services/supabaseService.js`, `src/services/rapidApiService.js`
- Contains: DB CRUD operations, GIF loading
- Depends on: `sbClient`, `APP_CONFIG`
- Used by: Module layer

**Module Layer:**
- Purpose: Business logic and UI rendering
- Location: `src/modules/*.js`
- Contains: Auth, UI, Exercise Bank, Avaliacao
- Depends on: Service layer, data layer
- Used by: HTML onclick handlers (via window globals)

## Data Flow

### Primary Request Path (App Load)

1. **index.html parses** → loads `config.js` and `supabase_config.js` synchronously
2. **Sync scripts execute** → `avProto.js`, `exEnMap.js`, `geometry.js`, `rapidApiService.js` populate window globals
3. **Module script loads** → `src/main.js` (type="module", deferred)
4. **main.js imports** → ui.js, supabaseService.js, auth.js, exerciseBank.js, avaliacao.js
5. **auth.js init()** → calls `sbClient.auth.onAuthStateChange()`
6. **Auth state change** → if signed in, calls `fetchDashboard()` and `fetchClientes()`

### Authentication Flow

1. User clicks "Sign in with Google" → `signInWithGoogle()` (`auth.js:29`)
2. Supabase OAuth redirect to Google
3. Callback to `index.html` with session
4. `onAuthStateChange` fires → `checkAccess(email)` validates against whitelist
5. If allowed: `_showApp(user)` renders UI, calls `fetchDashboard()`, `fetchClientes()`
6. If not allowed: `_showLoginError()`, `signOut()`

### Postural Assessment Flow

1. User uploads 4 photos (front, back, lateral D, lateral E) → `avHandlePhoto()` (`avaliacao.js:71`)
2. User clicks "Analisar Postura" → `avRunAnalysis()` (`avaliacao.js:166`)
3. **Lazy TF.js load** → `_avLoadTFJS()` dynamically injects TF.js and MoveNet scripts
4. **Pose detection** → `detector.estimatePoses()` for each view
5. **Angular calculation** → `avCalcM()` computes asymmetry metrics
6. **Canvas rendering** → `avDrawCanvas()` draws skeleton overlay
7. **Results display** → `avRenderM()` shows measurements, `avRenderProto()` shows corrective protocol
8. **GIF loading** → `loadExGif()` queues exercise GIFs from RapidAPI

### Workout Builder Flow

1. User selects client → `loadWorkoutClientSelector()` populates dropdown (`supabaseService.js:299`)
2. User drags/searches exercises → `exBankFilter()` / `exBankSearchDebounce()` filters cache
3. User clicks "Incluir no Protocolo" → `exBankAddToWorkout()` adds DOM element
4. User clicks "Enviar Treino (Whats)" → `sendWorkoutToWhatsApp()` encodes workout as WhatsApp link

**State Management:**
- Supabase Auth state: managed by Supabase client (localStorage)
- Exercise cache: `_exercises` array in `exerciseBank.js` (module-level singleton)
- Assessment photos: `avPhotos` object in `avaliacao.js` (module-level)
- Agenda date: `_agendaCurrentDate` in `supabaseService.js` (module-level)

## Key Abstractions

**Supabase Client Singleton:**
- Purpose: Single DB connection point
- Examples: `window.sbClient` in `supabase_config.js:6`
- Pattern: Global variable, created before any module loads

**Exercise Cache Singleton:**
- Purpose: Load exercises once, filter locally
- Examples: `_exercises` in `src/modules/exerciseBank.js:16`
- Pattern: Module-level variable, populated on first `fetchExercises()` call

**Protocol Data:**
- Purpose: Corrective exercise prescriptions by deviation
- Examples: `window.AV_PROTO` in `src/data/avProto.js`
- Pattern: Static lookup table

**MoveNet Connection Map:**
- Purpose: Skeleton wireframe connections
- Examples: `window.AV_CONNS` in `src/data/exEnMap.js:2`
- Pattern: Array of [keypointA, keypointB] pairs

## Entry Points

**index.html:**
- Location: `index.html`
- Triggers: Browser loads page
- Responsibilities: Renders splash screen, app shell, tab content; loads scripts in order

**src/main.js:**
- Location: `src/main.js`
- Triggers: `<script type="module">` deferred load
- Responsibilities: Import all modules, init service worker, handle PWA install prompt

**Service Worker:**
- Location: `sw.js`
- Triggers: Browser install event
- Responsibilities: Cache static assets, serve with appropriate strategy

## Architectural Constraints

- **No bundler:** Plain ES Modules - no Webpack/Rollup/Vite
- **Global window pattern:** Modules communicate via `window.*` properties, not imports
- **Sync-before-module load:** Data files and config must load synchronously before main.js
- **Single HTML page:** All content in `index.html`, tabs show/hide sections
- **Auth guard:** All functionality requires Supabase auth + email whitelist check

## Anti-Patterns

### Global Variable Pollution

**What happens:** All modules export functions to `window` object instead of using ES module imports
**Why it's wrong:** Creates implicit dependencies, makes tree-shaking impossible, clutters global namespace
**Do this instead:** Use ES module imports/exports, or use a single global namespace object (e.g., `window.WindsonPT = { functions... }`)

### Circular Dependency Risk in Script Loading Order

**What happens:** Scripts must load in specific order (data files before modules, config before all)
**Why it's wrong:** Not explicit, easy to break, no static analysis
**Do this instead:** Use a module bundler with explicit dependency declarations

### Inline Event Handlers

**What happens:** `onclick="avTriggerUpload('front')"` in HTML (`index.html:296`)
**Why it's wrong:** Mixed concerns, hard to test, can't use event delegation efficiently
**Do this instead:** Add event listeners in JS with `element.addEventListener('click', ...)`

### Hardcoded Secrets in Browser

**What happens:** API keys in `config.js` are visible to anyone inspecting the app
**Why it's wrong:** RapidAPI key can be stolen; Supabase anon key is public but should be documented
**Do this instead:** Use Netlify functions/env vars for server-side API calls; document Supabase anon key is public by design

## Error Handling

**Strategy:** Try-catch with user-facing alerts and console errors

**Patterns:**
- DB errors: Caught in async functions, logged and shown as UI message (`supabaseService.js:55-56`)
- Network errors: Silent fail for GIF loading (`rapidApiService.js:62`)
- TF.js errors: Detailed alert with troubleshooting steps (`avaliacao.js:200-201`)
- Auth errors: Alert popup (`auth.js:40`, `auth.js:52`)

## Cross-Cutting Concerns

**Logging:** `console.log/warn/error` with `[Windson PT]` prefix in service worker only
**Validation:** Basic form validation (empty checks) before DB inserts
**Authentication:** Supabase OAuth + email whitelist + `onAuthStateChange` observer

---

*Architecture analysis: 2026-05-04*