@AGENTS.md

# Listwave

Personal launch-kit + directory-submission tool: prep a project's assets once,
then work a cockpit of launch outlets (per-outlet copy, "open submit page",
progress tracking). The outlet list is user-managed — add/edit/remove in-app.
Assisted, never auto-bot.

## Stack
Next.js 16 (App Router, `src/`, Turbopack) · TypeScript · Tailwind v4 · Supabase
(`@supabase/ssr`: Postgres + Storage + email/password auth). Next 16 uses
`src/proxy.ts` (not middleware.ts) for session refresh.

## Architecture (where things live)
- **Outlets are user-managed DB rows** (`public.outlets`, per-user, RLS), not a
  static dataset. A new account is auto-seeded from `src/lib/outlets/seed.ts`
  (generated from repo-root `awesome_saas_directories.csv` via
  `scratchpad/gen-seed.mjs`; ~41 entries: name/url/description). Seeding happens
  in `getOutlets()` (`src/lib/data.ts`) when the user has zero outlets.
- `src/lib/outlets/` — `index.ts` loads the hand-curated **guides** (`data/*.json`,
  `OutletGuide` type: real submit URLs + field maps; still UNVERIFIED — check live
  forms). `enrich.ts` overlays a guide onto an outlet BY HOSTNAME (sets
  `guided`/`fields`/`steps`/`submit_url`) and exports `GENERIC_FIELDS` (the
  fallback kit). No phases/DR/categories anymore.
- `src/lib/mapping.ts` — maps the kit into each field (truncate, `{{key}}`
  templates). `src/lib/data.ts` — Supabase queries (projects, outlets+seed,
  submissions). `src/app/actions.ts` — server actions incl. outlet
  add/edit/remove. `supabase/schema.sql` — DB schema + RLS (submissions.outlet_id
  is now a uuid FK into `outlets`).
- Screens: `ProjectForm.tsx` (enter kit once), `Cockpit.tsx` (flat outlet list +
  search/hide-done + add/edit/remove), `OutletSubmit.tsx` (per-outlet prepare view).

## Conventions
- **Colors = semantic tokens only** (`bg-surface`/`bg-card`/`text-fg`/`text-muted`/
  `text-faint`/`border-border`/`bg-track`/`bg-accent`+`text-accent-fg`), defined in
  `src/app/globals.css`. Do NOT use raw `neutral-*`/`white`. Dark mode is the
  `.dark` class strategy; colored accents need explicit `dark:` variants.

## Run
`npm run dev` (needs real values in `.env.local`). `npm run build` / `npx tsc
--noEmit` / `npm run lint` to verify.

## Status & next steps
See memory `launchkit-build-state` for current status and the ordered next
steps (open decision: description-variants feature; nothing committed to git
yet; full dogfood pending).
