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
  static dataset. Each row has a `project_id`: **null = the per-user MASTER
  template; set = a copy owned by that one project.** A new project copies the
  whole master list into its own rows on creation (`saveProject` in `actions.ts`),
  so edits/removes within a project never touch master or sibling projects (new
  master additions do NOT retroactively flow into existing projects). `sort_order`
  drives manual drag-ordering. Data helpers: `getMasterOutlets()` (seeds the
  master from `src/lib/outlets/seed.ts` — ~41 entries generated from repo-root
  `awesome_saas_directories.csv` via `scratchpad/gen-seed.mjs` — when empty),
  `getProjectOutlets(id)`, `getOutletCountsByProject()` (all in `src/lib/data.ts`).
- `src/lib/outlets/` — `index.ts` loads the hand-curated **guides** (`data/*.json`,
  `OutletGuide` type: real submit URLs + field maps; still UNVERIFIED — check live
  forms). `enrich.ts` overlays a guide onto an outlet BY HOSTNAME (sets
  `guided`/`fields`/`steps`/`submit_url`) and exports `GENERIC_FIELDS` (the
  fallback kit). No phases/DR/categories anymore.
- `src/lib/mapping.ts` — maps the kit into each field (truncate, `{{key}}`
  templates). `src/app/actions.ts` — server actions incl. outlet
  add/edit/remove/`reorderOutlets` (a `projectId` arg scopes to a project; omit =
  master). `supabase/schema.sql` — DB schema + RLS (submissions.outlet_id is a
  uuid FK into `outlets`; **re-running needs `drop table submissions; drop table
  outlets;` first** — see note at top of the file).
- Screens: `ProjectForm.tsx` (enter kit once), `Cockpit.tsx` (project's outlet
  list: search + Hide completed/skipped + add/edit/remove), `OutletSubmit.tsx`
  (per-outlet prepare view), `/outlets` → `MasterOutlets.tsx` (manage the master
  template). Shared `OutletForm.tsx` + `SortableList.tsx` (Manual-drag/A→Z/Z→A,
  drag handles hidden while filtered) power both lists.

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
steps. Pushed through `b3c6753` (rebrand + master/project outlet split + drag/
sort ordering). Pending: apply the schema migration to live Supabase (drop
submissions + outlets, re-run schema.sql), full dogfood, description-variants
decision.
