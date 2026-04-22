## Supabase setup

The project is configured for Supabase CLI workflows, so normal schema changes can happen from the repo instead of the web portal.

### One-time setup

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

If you want the full local Supabase stack, also run:

```bash
supabase start
```

That requires Docker or a compatible container runtime.

### Migrations

The initial schema lives in:

- `supabase/migrations/20260422_init_glai.sql`

Current hosted project:

- project ref: `ryzxpkpfsmmxutkfwknc`
- initial migration status: applied
- local CLI status: linked

Apply migrations to the linked remote project with:

```bash
supabase db push
```

Create future migrations with:

```bash
supabase migration new <descriptive_name>
```

Pull the remote schema back into migrations if needed:

```bash
supabase db pull
```

### Environment variables used by the app

Set these in `.env.local`:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_KEY=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

The app also accepts:

```bash
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

### Security note

The app currently syncs directly from the client with a publishable/anon key because v1 has no auth layer.
That is acceptable for a single-user prototype, but it is not a strong security model for wider distribution.

Before shipping this beyond a trusted user, move writes behind either:

- Supabase Auth with real row-level security policies
- a server or edge-function proxy that holds elevated credentials
