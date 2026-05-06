# Coding Conventions

**Analysis Date:** 2026-05-04

## Naming Patterns

**Files:**
- camelCase: `supabaseService.js`, `rapidApiService.js`, `exerciseBank.js`
- No dashes in JS files

**Functions:**
- camelCase: `fetchClientes`, `exBankFilter`, `avRunAnalysis`, `signInWithGoogle`
- Verb-first naming: `fetch*`, `create*`, `update*`, `render*`, `handle*`, `show*`, `open*`, `close*`

**Variables:**
- camelCase: `avPhotos`, `avDetector`, `_exercises`, `_currentMuscle`
- Private module variables: underscore prefix `_variableName`
- DOM elements: often prefixed with `$` or descriptive name: `grid`, `el`, `btn`

**Types:**
- No TypeScript - JSDoc not consistently used
- Object structures documented in block comments at file start

**Constants:**
- SCREAMING_SNAKE_CASE: `ALLOWED_EMAILS`, `CACHE_NAME`, `RAPIDAPI_KEY`
- Also: module-level plain const in geometry.js

## Code Style

**Formatting:**
- No Prettier/ESLint configured (no `.eslintrc*`, `.prettierrc*`)
- 2-space indentation (from Tailwind CSS defaults)
- No semicolons at line ends

**Linting:**
- None configured

**Key Style Observations:**
- Uses semicolons in `geometry.js` but not consistently
- Single quotes for strings in JS, double quotes in HTML attributes
- Template literals for HTML generation
- Arrow functions for callbacks

## Import Organization

**Pattern:** ES Module imports at top of `main.js`:
```javascript
import './modules/ui.js';
import './services/supabaseService.js';
import './modules/auth.js';
```

**Global Window Pattern (legacy):**
```javascript
// Data files expose globals
window.AV_PROTO = AV_PROTO;
window.EX_EN_MAP = EX_EN_MAP;

// Modules expose functions via window
window.fetchClientes = fetchClientes;
window.avRunAnalysis = avRunAnalysis;
```

**Dependency Order (index.html):**
```html
<!-- 1. Config (defines window.APP_CONFIG, window.sbClient) -->
<script src="./config.js"></script>
<script src="./supabase_config.js"></script>

<!-- 2. Data/sync scripts (populate window globals) -->
<script src="./src/data/avProto.js"></script>
<script src="./src/data/exEnMap.js"></script>
<script src="./src/utils/geometry.js"></script>
<script src="./src/services/rapidApiService.js"></script>

<!-- 3. Module script (ES Module, deferred) -->
<script type="module" src="./src/main.js"></script>
```

## Error Handling

**Patterns:**
- try-catch with user alerts for recoverable errors:
  ```javascript
  try {
    // operation
  } catch (err) {
    alert('Erro ao salvar cliente: ' + err.message);
  }
  ```
- Silent catch for non-critical operations:
  ```javascript
  } catch(e) { /* silent — sem chave ou offline */ }
  ```
- Console logging for debugging:
  ```javascript
  console.error('[Windson PT] Erro IA:', e);
  ```

## Logging

**Framework:** Native `console` API

**Patterns:**
- Service worker uses prefixed log: `console.log('[Windson PT] SW:', reg.scope)`
- DB errors logged before UI message: `console.error('Erro ao buscar clientes:', err);`
- TF.js errors logged: `console.error('[Windson PT] Erro IA:', e);`

## Comments

**When to Comment:**
- File header comment explaining purpose and dependencies (all modules)
- Complex logic explained inline
- No JSDoc on functions

**Example (auth.js):**
```javascript
// ─── Whitelist ───────────────────────────────────────────────────────────────
// E-mails autorizados. Qualquer outro é bloqueado imediatamente.
const ALLOWED_EMAILS = [...];
```

## Function Design

**Size:** Functions are generally small and focused (< 50 lines), with exceptions for render functions

**Parameters:**
- Direct parameters, max 2-3 typical
- View parameter often passed as string: `avTriggerUpload(view)`

**Return Values:**
- async functions return Promise (DB operations)
- sync functions return directly or manipulate DOM

**Examples:**
```javascript
// From avaliacao.js
async function avRunAnalysis() { ... }
function avDrawCanvas(view, img, pose) { ... }
function avCalcM(pose, view) { ... }

// From exerciseBank.js
async function fetchExercises() { return _exercises; }
function getExercisesByMuscle(muscle) { return _exercises.filter(...); }
```

## Module Design

**Exports:** All via `window` object (legacy pattern)
```javascript
window.fetchExercises = fetchExercises;
window.exBankFilter   = exBankFilter;
```

**Barrel Files:** None - all module dependencies via global `window`

**Module Pattern:**
```javascript
// src/modules/exerciseBank.js
const sbClient = window.sbClient; // Get dependency from global

let _exercises = []; // Private state
let _currentMuscle = 'chest';

async function fetchExercises() { ... }
function getExercisesByMuscle(muscle) { ... }

// Export
window.fetchExercises = fetchExercises;
```

## HTML Generation

**Pattern:** Template literals with `.innerHTML` or `.insertAdjacentHTML`
```javascript
const card = document.createElement('div');
card.className = 'glass-panel stagger-item rounded-2xl p-6...';
card.innerHTML = `
  <div class="flex items-center gap-4">
    <div class="w-14 h-14 rounded-full...">${init}</div>
    <div class="flex-1">
      <h3 class="font-headline font-bold...">${c.nome_completo || 'Cliente'}</h3>
    </div>
  </div>
`;
```

**Security Note:** Direct `.innerHTML` usage - potential XSS if user data is injected without sanitization

---

*Convention analysis: 2026-05-04*