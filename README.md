# 🚀 Listwave

Prep your project's assets once, then launch it across many directories from a
single cockpit: per-outlet pre-formatted copy (tap-to-copy), an "open the submit
page" button, and progress tracking. Submission is **assisted, not auto-botted**.

Stack: Next.js 16 (App Router, Turbopack) · Supabase (Postgres + Storage +
email/password auth) · Tailwind v4. Next 16 uses `src/proxy.ts` (not
`middleware.ts`) for session refresh.

## How outlets work

Outlets are **user-managed Supabase rows** (`public.outlets`, per-user, RLS) —
add, edit, and remove them in the cockpit. A new account is auto-seeded with ~41
starter outlets from [`src/lib/outlets/seed.ts`](src/lib/outlets/seed.ts)
(generated from repo-root `awesome_saas_directories.csv`).

On top of that, 14 hand-curated **guides** ([`src/lib/outlets/data/*.json`](src/lib/outlets/data))
carry real submit URLs and per-field maps. A guide is overlaid onto an outlet
**by hostname** (see [`src/lib/outlets/enrich.ts`](src/lib/outlets/enrich.ts)):
matching outlets (Product Hunt, BetaList, SaaSHub, …) get the rich guided
prepare view; everything else gets the generic kit.

## One-time setup

1. **Create a Supabase project** at https://supabase.com (free tier).
2. **Run the schema:** open the SQL Editor and paste all of
   [`supabase/schema.sql`](supabase/schema.sql), then run it. This creates the
   `projects`, `outlets`, and `submissions` tables, RLS policies, the
   `updated_at` triggers, and the `assets` storage bucket.
3. **Configure env:** copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     (Supabase → Project Settings → API)
   - `NEXT_PUBLIC_SITE_URL` = `http://localhost:3000` for local dev
4. **Create your user:** auth is email + password. If new signups are disabled
   on your Supabase project, add a user via Supabase → Authentication → Users →
   Add user (Auto Confirm), then sign in with it.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

Sign in, create a project, then work the cockpit. Verify with
`npm run build` / `npx tsc --noEmit` / `npm run lint`.

## How it fits together

| Piece | Where |
|---|---|
| Domain types | [src/lib/types.ts](src/lib/types.ts) |
| Outlet guides (hostname-matched) | [src/lib/outlets/](src/lib/outlets/) |
| Guide enrichment + generic kit | [src/lib/outlets/enrich.ts](src/lib/outlets/enrich.ts) |
| Starter seed list | [src/lib/outlets/seed.ts](src/lib/outlets/seed.ts) |
| Mapping engine (map + truncate) | [src/lib/mapping.ts](src/lib/mapping.ts) |
| Data access (projects, outlets, submissions) | [src/lib/data.ts](src/lib/data.ts) |
| Server actions (incl. outlet add/edit/remove) | [src/app/actions.ts](src/app/actions.ts) |
| Screen 1 — enter project once | [src/components/ProjectForm.tsx](src/components/ProjectForm.tsx) |
| Screen 2 — launch cockpit | [src/components/Cockpit.tsx](src/components/Cockpit.tsx) |
| Screen 3 — per-outlet submit | [src/components/OutletSubmit.tsx](src/components/OutletSubmit.tsx) |

## ⚠️ Guide configs need verification

The 14 curated guides have field/limit guesses drafted from how each form is
known to look. **Verify each one against its live submit page before trusting
it** — see [src/lib/outlets/data/README.md](src/lib/outlets/data/README.md).
Forms drift; keep the set small and maintained rather than large and stale.

## Adding outlets

In-app: use "+ Add outlet" in the cockpit (saved to your `outlets` table).

To extend the curated guide set: drop a new `<id>.json` in
`src/lib/outlets/data/` matching the `OutletGuide` type. It's picked up
automatically — no code change.

## Not built yet (deferred by design)

- ✨ LLM copy-variant generation (optional, cheap, cached)
- Tier-2 browser-extension auto-fill
- Stripe billing
- Tier-3 server-side auto-submit — intentionally avoided (gets products banned)
