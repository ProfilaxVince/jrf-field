# Supabase setup — JRF Field (Lot 1)

Steps to create the Supabase project and push the schema/seed that already exist in `supabase/`.

1. Create a Supabase project (UI)
   - Go to https://app.supabase.com and sign in.
   - Create a new project in the Frankfurt region (EU).
   - Set a strong password for the DB; keep the project keys safe.

2. Install the Supabase CLI (locally) if you want to run migrations from terminal.

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase-cli
```

3. Login via CLI

```bash
supabase login
```

4. Link the local repo to the Supabase project (get the `ref` from the project settings)

```bash
supabase link --project-ref your-project-ref
```

5. Push migrations and seed

```bash
supabase db push --file supabase/migrations
supabase db seed --file supabase/seed.sql
```

6. Generate types for the frontend (once the DB exists)

```bash
supabase gen types typescript --local > src/lib/data/database.types.ts
```

7. Update your `.env.local` with the values shown in the Supabase project (use the anon key for client, service role only server-side).

8. Start dev

```bash
npm run dev
```

Notes:
- RLS and policies are in the migrations; ensure the `auth` schema is present.
- If you prefer automation, install `gh` and `supabase` CLIs and run the commands to create project from terminal — I can help run those if you provide access or run them locally.
