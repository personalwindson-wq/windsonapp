# External Integrations

**Analysis Date:** 2026-05-04

## APIs & External Services

**Authentication:**
- Google OAuth - Sign-in via Supabase Auth (`src/modules/auth.js:29`)
- Apple OAuth - Sign-in via Supabase Auth (`src/modules/auth.js:44`)

**AI/Pose Detection:**
- TensorFlow.js Cloud Models - MoveNet Thunder/Lightning
  - Model loaded from CDN: `@tensorflow-models/pose-detection@2.1.3`
  - Used for: postural assessment angular analysis (`src/modules/avaliacao.js`)
  - Auth: None (anonymous CDN access)

**Exercise Database:**
- RapidAPI ExerciseDB - Exercise GIF/images
  - Endpoint: `https://exercisedb.p.rapidapi.com/exercises/name/{term}`
  - Key: `window.APP_CONFIG.RAPIDAPI_KEY` (from `config.js`)
  - Used for: Loading exercise demonstration GIFs (`src/services/rapidApiService.js:51`)

## Data Storage

**Primary Database:**
- **Supabase (PostgreSQL)**
  - Project: `hddlvnmpbbkvzbhqmsjo.supabase.co`
  - Client: `@supabase/supabase-js@2` initialized in `supabase_config.js:6`
  - Tables: `clientes`, `agendamentos`, `treinos`, `exercises`, `pagamentos`
  - Auth: Anon key (publishable) - Row Level Security policies

**File Storage:**
- Supabase Storage (inferred - not explicitly configured in code)

**Local Caching:**
- localStorage `wpt_gifs` - Exercise GIF cache, 7-day TTL (`src/services/rapidApiService.js:20-32`)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Providers: Google OAuth, Apple OAuth
  - Flow: OAuth redirect with `window.location.origin + window.location.pathname` as redirectTo
  - Session: Handled by Supabase client, persisted in localStorage

**Email Whitelist:**
- Hardcoded whitelist in `src/modules/auth.js:15-19`:
  ```javascript
  const ALLOWED_EMAILS = [
    'windsonwood32@gmail.com',
    'gustavolima281189@gmail.com',
    'julio.cborges2@gmail.com',
  ];
  ```
  - Only whitelisted users can access the app after OAuth sign-in

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, LogRocket, etc.)

**Logs:**
- `console.log`/`console.warn`/`console.error` throughout modules
- Service worker logs: `[Windson PT] SW:` prefix (`sw.js:38`)

## CI/CD & Deployment

**Hosting:**
- Netlify (inferred from `netlify.toml`)
  - Build command: `npm install && npm run build:css`
  - Publish directory: `.` (root)

**CI Pipeline:**
- Netlify automatic deploys on git push

## Environment Configuration

**Required env vars (in `config.js`):**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous/publishable key
- `RAPIDAPI_KEY` - RapidAPI key for ExerciseDB

**Secrets location:**
- `config.js` - **In `.gitignore`, NOT committed**
- Contains actual API keys (including Supabase anon key and RapidAPI key)
- `.env.example` - Template file that IS committed (no real values)

**Critical Security Note:**
- `config.js:6-8` contains hardcoded API keys that are visible in browser
- Supabase anon key is designed to be public (RLS policies protect data)
- RapidAPI key in browser is a security risk - should use backend proxy

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- WhatsApp deep links: `https://wa.me/55{phone}?text={encoded}` - Used for sharing workouts and evaluations (`exerciseBank.js:269`, `avaliacao.js`)

---

*Integration audit: 2026-05-04*