# 🚀 Listwave

Prep your project's assets once, then launch it across many directories from a
single cockpit: per-outlet pre-formatted copy (tap-to-copy), an "open the submit
page" button, and progress tracking. Submission is **assisted, not auto-botted**.

Stack: Next.js 16 (App Router) · Supabase (Postgres + Storage + magic-link auth)
· Tailwind. Outlets live as version-controlled JSON in
[`src/lib/outlets/data`](src/lib/outlets/data) — that curated set is the moat.

## One-time setup

1. **Create a Supabase project** at https://supabase.com (free tier).
2. **Run the schema:** open the SQL Editor and paste all of
   [`supabase/schema.sql`](supabase/schema.sql), then run it. This creates the
   `projects` + `submissions` tables, RLS policies, and the `assets` storage bucket.
3. **Configure env:** copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     (Supabase → Project Settings → API)
   - `NEXT_PUBLIC_SITE_URL` = `http://localhost:3000` for local dev
4. **Auth redirect:** in Supabase → Authentication → URL Configuration, add
   `http://localhost:3000/**` to the redirect allowlist.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

Sign in with a magic link, create a project, then work the cockpit.

## How it fits together

| Piece | Where |
|---|---|
| Domain types | [src/lib/types.ts](src/lib/types.ts) |
| Outlet knowledge base | [src/lib/outlets/](src/lib/outlets/) |
| Mapping engine (map + truncate) | [src/lib/mapping.ts](src/lib/mapping.ts) |
| Data access | [src/lib/data.ts](src/lib/data.ts) |
| Server actions | [src/app/actions.ts](src/app/actions.ts) |
| Screen 1 — enter project once | [src/components/ProjectForm.tsx](src/components/ProjectForm.tsx) |
| Screen 2 — launch cockpit | [src/components/Cockpit.tsx](src/components/Cockpit.tsx) |
| Screen 3 — per-outlet submit | [src/components/OutletSubmit.tsx](src/components/OutletSubmit.tsx) |

## ⚠️ Outlet configs need verification

The 14 seeded outlets have field/limit guesses drafted from how each form is
known to look. **Verify each one against its live submit page before trusting
it** — see [src/lib/outlets/data/README.md](src/lib/outlets/data/README.md).
Forms drift; keep the set small and maintained rather than large and stale.

## Adding an outlet

Drop a new `<id>.json` in `src/lib/outlets/data/` matching the `Outlet` type.
It's picked up automatically — no code change.

## Not built yet (deferred by design)

- ✨ LLM copy-variant generation (optional, cheap, cached)
- Tier-2 browser-extension auto-fill
- Stripe billing
- Tier-3 server-side auto-submit — intentionally avoided (gets products banned)
