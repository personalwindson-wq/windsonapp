# Technology Stack

**Analysis Date:** 2026-05-04

## Languages

**Primary:**
- JavaScript (ES2022+) - All application logic in `src/modules/`, `src/services/`
- HTML5 - Single page app entry `index.html`
- CSS3 - Tailwind CSS with custom design system in `src/css/input.css`

**Secondary:**
- SQL - Database migrations in `scripts/migration.sql`, `scripts/seed_exercises.sql`

## Runtime

**Environment:**
- Browser (vanilla JS, no framework runtime)
- PWA with Service Worker (`sw.js`)

**Package Manager:**
- npm 10.x
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Tailwind CSS v3.4.4 - Utility-first styling
  - Plugins: `@tailwindcss/forms`, `@tailwindcss/container-queries`
- Vanilla JavaScript ES Modules - No React/Vue/Angular
  - Entry: `src/main.js` (type="module")

**AI/Machine Learning:**
- TensorFlow.js v4.10.0 - Loaded lazily via CDN
- MoveNet pose-detection v2.1.3 - Body keypoint detection

**Image Processing (Build-time only):**
- Jimp v1.6.1 - Image processing for GIF generation
- gif-encoder-2 v1.0.5 - GIF encoding

**Build:**
- Tailwind CLI - CSS compilation
  - `npm run build:css` → `tailwindcss -i ./src/css/input.css -o ./dist/style.css --minify`

## Key Dependencies

**Critical (production):**
- `@supabase/supabase-js@2` - Backend database client (CDN loaded in `index.html:15`)
- `@tensorflow/tfjs@4.10.0` - AI inference (lazy loaded in `avaliacao.js:126`)
- `@tensorflow-models/pose-detection@2.1.3` - MoveNet model (lazy loaded in `avaliacao.js:129`)

**Dev only:**
- tailwindcss v3.4.4
- @tailwindcss/forms v0.5.7
- @tailwindcss/container-queries v0.1.1

**External Services (CDN):**
- Supabase SDK: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- TensorFlow.js: `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js`
- MoveNet: `https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js`
- Google Fonts: Inter, Sora, Space Grotesk
- Material Symbols Icons

## Configuration

**Environment:**
- `config.js` - Runtime config (API keys, Supabase credentials)
  - **NOTE:** This file contains hardcoded secrets and is in `.gitignore` - loaded before modules
- `supabase_config.js` - Supabase client initialization
- `.env.example` - Template for environment variables

**Build:**
- `tailwind.config.js` - Custom design system colors, fonts
- `netlify.toml` - Build command: `npm install && npm run build:css`

**PWA:**
- `manifest.json` - PWA manifest with icons, theme color `#D4AF37`
- `sw.js` - Service worker with cache strategies

## Platform Requirements

**Development:**
- Node.js 18+ for Tailwind CLI
- npm for dependency management

**Production:**
- Browser with ES Modules support
- Service Worker support (for PWA)
- WebGL support (for TensorFlow.js/MoveNet)

---

*Stack analysis: 2026-05-04*