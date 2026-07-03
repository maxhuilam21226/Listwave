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
  master additions do NOT retroactively flow into existing projects). One
  exception: **editing a master outlet's name/url/description propagates that
  change to every project's copy** of it (`updateOutlet` in `actions.ts`) —
  copies link back via `outlets.master_outlet_id` (set when `saveProject` copies
  the list; null on master rows and on copies whose master was deleted, `on
  delete set null`); each copy's `field_overrides` are left untouched. `sort_order`
  drives manual drag-ordering. Data helpers: `getMasterOutlets()` (seeds the
  master from `src/lib/outlets/seed.ts` — ~41 entries generated from repo-root
  `awesome_saas_directories.csv` via `scratchpad/gen-seed.mjs` — when empty),
  `getProjectOutlets(id)`, `getOutletCountsByProject()` (all in `src/lib/data.ts`).
- `src/lib/outlets/` — `index.ts` loads the hand-curated **guides** (`data/*.json`,
  `OutletGuide` type: real submit URLs + field maps; still UNVERIFIED — check live
  forms). `enrich.ts` overlays a guide onto an outlet BY HOSTNAME (sets
  `guided`/`fields`/`steps`/`submit_url`) and exports `GENERIC_FIELDS` (the
  fallback kit). No phases/DR/categories anymore.
- `src/lib/mapping.ts` — computes the **default** value of each field from the kit
  (truncate, `{{key}}` templates). It is NOT override-aware; the per-outlet override
  overlay lives in `OutletSubmit.tsx`. `src/app/actions.ts` — server actions incl.
  outlet add/edit/remove/`reorderOutlets` (a `projectId` arg scopes to a project;
  omit = master) and `saveOutletFieldOverrides`. `supabase/schema.sql` — DB schema +
  RLS (submissions.outlet_id is a uuid FK into `outlets`; **re-running needs `drop
  table submissions; drop table outlets;` first** — see note at top of the file).
- **Per-outlet field overrides (copy-on-write):** `outlets.field_overrides jsonb`
  maps a submit-form field `key` → the user's literal text for THAT outlet. Missing
  key = inherit the kit-computed default; present key = frozen (later kit edits don't
  flow in until Reset). The whole map is saved on blur / on AI-apply.
- **In-browser AI rewording (WebGPU):** `src/lib/ai/webllm.ts` lazily loads
  `@mlc-ai/web-llm` (`Qwen2.5-1.5B-Instruct`, ~1GB, cached) via a dynamic import so
  it stays out of the server bundle; exports `isWebGPUAvailable()` + `reword()`.
  `src/components/AIAssist.tsx` is the ✨ Shorter/Longer/Tone control — renders
  nothing without WebGPU (no server fallback). Assistable = text/textarea/tags
  fields except product **name**, **contact email**, **pricing**, and **asset**
  fields.
- Screens: `ProjectForm.tsx` (enter kit / "Edit default"; AI on the 4 copy fields),
  `Cockpit.tsx` (project's outlet list: search + Hide completed/skipped +
  add/edit/remove), `OutletSubmit.tsx` (per-outlet prepare view: **editable** fields
  with Default/Edited badge + Reset + ✨ AI), `/outlets` → `MasterOutlets.tsx`
  (manage the master template). Shared `OutletForm.tsx` + `SortableList.tsx`
  (Manual-drag/A→Z/Z→A, drag handles hidden while filtered) power both lists.

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
steps. Pushed through `423e1ef` on `main` (rebrand + master/project split +
drag/sort ordering + per-outlet field overrides + WebGPU AI rewording). Live
Supabase schema is in sync (`field_overrides` column applied) and the override +
AI features are confirmed working end-to-end.

UNCOMMITTED (working tree on `423e1ef`, tsc + lint pass) — three stacked features:
1. **Paid/free outlet cost** — `outlets.cost` (`'free'|'paid'`) column, Free/Paid
   select in `OutletForm`, All/Free/Paid filter + `$ paid` badge in `Cockpit` +
   `MasterOutlets`. `cost` on `Outlet`/`OutletInput`; `saveProject` copies it;
   master cost-edit propagates to copies.
2. **Delete projects from the dashboard** — hover/focus trash button per card
   (`DeleteProjectButton.tsx`) calling the existing `deleteProject` action
   (cascades outlets+submissions clean).
3. **Multi-theme system + cross-device persistence** — 4 families (**Aurora Glass**
   default / **Editorial Mono** / **Mission Control** / **Soft Clay**), each in
   light + dark. Axes: `data-theme` attr × `.dark` class. `globals.css` defines
   per-family semantic tokens + recipe vars, consumed by neutral classes
   **`.panel` / `.panel-card` / `.btn-primary` / `.brand-ink` / `.progress-fill`**
   (these replaced the aurora-only `.glass`/`.btn-aurora`/`.text-aurora`). Picker
   = `ThemeControls.tsx` (replaced `ThemeToggle.tsx`). Choice saved per-user in new
   **`public.profiles`** table via `saveThemePreference`; `getThemePreference` +
   the layout's server-embedded `themeInitScript` make a fresh device paint the
   right theme with no flash (precedence DB → localStorage → OS). NOTE: only the
   dashboard + shell use the recipe classes so far; other screens adopt theme
   COLORS but not per-theme surface styling.

**TODO before live:** apply TWO migrations to Supabase — (a) `alter table
public.outlets add column if not exists cost text not null default 'free' check
(cost in ('free','paid'));` and (b) the `public.profiles` CREATE TABLE + trigger +
RLS block (in `supabase/schema.sql`) — then commit the working tree.

Open: apply migrations + commit + dogfood cost/delete/theme (incl. cross-device
follow); optionally roll the theme recipes onto the remaining screens; the 14
curated guide field-maps are still UNVERIFIED.
