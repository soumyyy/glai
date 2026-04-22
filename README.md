# Glai

Glai is an Expo React Native app for photo-based meal logging with a strong diabetes use case:
capture a meal, run a two-step AI analysis, review the detected items, and save structured nutrition data locally with optional Supabase sync.

## Current state

The meal capture flow is implemented:

- camera capture or gallery import
- image compression to base64
- two-step OpenAI analysis
- review and correction
- local SQLite save
- background Supabase sync when configured

The main read-only screens are still scaffold-level UI and will be refined next.

## Environment

Create `.env.local` in the project root.

```bash
EXPO_PUBLIC_OPENAI_API_KEY=
EXPO_PUBLIC_OPENAI_MODEL=gpt-4o-2024-11-20
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_KEY=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
# or use EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY instead of the anon key name
```

Notes:

- OpenAI is required for meal analysis.
- Supabase is optional during development. If the Supabase env vars are blank, cloud sync is skipped and local saves still work.
- The backend now supports `EXPO_PUBLIC_SUPABASE_KEY`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Local development

Install dependencies and start the app:

```bash
npm install
npx expo start
```

Quality checks:

```bash
npx tsc --noEmit
npm run lint
```

## Backend architecture

### OpenAI

Meal analysis is intentionally split into two calls:

1. identify visible dishes
2. estimate weight and nutrition ranges for those identified dishes

The OpenAI layer now uses:

- a shared request helper
- request timeouts
- bounded retries for transient failures
- structured JSON-schema output
- runtime validation before the app accepts model output

### Local database

SQLite stores:

- `users`
- `meals`
- `meal_items`
- `daily_summaries`

Important detail:

- meals now store `logged_on_date` explicitly, so summaries are grouped by the user’s local day instead of UTC date boundaries

### Supabase

Supabase sync is best-effort and non-blocking:

- if env vars are missing, sync is skipped
- the local user row is synced first
- meals, meal items, and daily summaries are upserted
- a meal is marked synced locally only after the related cloud writes succeed

Current hosted project:

- project ref: `ryzxpkpfsmmxutkfwknc`
- initial migration: applied
- repo status: linked via Supabase CLI

## Supabase CLI workflow

The repo is now CLI-ready and includes:

- `supabase/config.toml`
- `supabase/migrations/20260422_init_glai.sql`
- `supabase/seed.sql`

Useful commands:

```bash
supabase --version
supabase login
supabase link --project-ref <your-project-ref>
supabase migration new <name>
supabase db push
supabase db pull
supabase start
supabase stop
```

Recommended workflow:

1. `supabase login`
2. `supabase link --project-ref <project-ref>`
3. edit or add SQL migrations in `supabase/migrations`
4. `supabase db push` to apply them to the linked project

For local Supabase development, `supabase start` requires Docker or a compatible container runtime.

## Project structure

```text
app/                  Expo Router screens
components/           Shared UI pieces
constants/            App constants
lib/ai/               OpenAI requests, schemas, validation
lib/db/               SQLite schema and queries
lib/supabase/         Supabase client and sync
supabase/             CLI config and SQL migrations
prd.md                Product requirements doc
docs/                 planning/spec docs
```

## Security note

This is still a v1 single-user architecture. Direct client-side Supabase sync with a publishable/anon key is convenient, but it is not a strong security boundary for broad distribution.

Before shipping this beyond a trusted personal workflow, move writes behind either:

- Supabase Auth plus real row-level security
- a server or edge-function layer that owns privileged operations
