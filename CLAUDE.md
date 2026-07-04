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
See memory `launchkit-build-state` for full detail. **✅ LIVE IN PRODUCTION at
https://listwave.vercel.app** (hosted on **Vercel** — auto-deploys on push to
`main`, PRs get preview URLs). `main` is at `f36bc85` (WebLLM Xet-CDN cache
fix); **uncommitted this session: logo, favicon/icons/manifest, Aurora animation
enhancements, animated brand-ink** — commit & push when ready.

**Logo & icons (2026-07-04, uncommitted):** `public/logo.png` (1024×1024 teal
wave icon). Next to "Listwave" in nav (`layout.tsx`), login, landing. Favicon
replaced: `src/app/favicon.ico` (RGBA ICO 16/32/48px), `src/app/icon.png`
(512px), `src/app/apple-icon.png` (180px for iOS home screen). `src/app/manifest.ts`
→ `/manifest.webmanifest` for Android home screen (purple theme_color, standalone).
`public/icon-192.png` + `public/icon-512.png` for manifest.

**Aurora animation (2026-07-04, uncommitted):** `@property` registered blob
positions so each of the 3 aurora blobs drifts independently. `body::after`
parallax glow layer (z-index: −2). `aurora-pulse` adds opacity + saturation +
hue-rotate shimmer. Opacity bumped in light & dark for better visibility.
`[data-theme="aurora"] .brand-ink` now runs `lw-grad-shift 4s` — same shifting
color animation as "Launch everywhere" hero text — on all brand text.

**WebLLM AI reword fix (2026-07-04):** in-browser ✨ reword broke with
"Cache.add() encountered a network error" — HuggingFace moved model weights to
their Xet CDN, which serves shards via a cross-origin 302 redirect that Chrome's
`Cache.add()` rejects. Fixed in `src/lib/ai/webllm.ts` via `appConfig: {
...prebuiltAppConfig, cacheBackend: "indexeddb" }` (IndexedDB backend downloads
with plain `fetch()`, which follows the redirect). Not yet verified in prod —
test ✨ AI after the deploy. See memory `webllm-xet-cdn-cache-fix`.

Shipped & verified (tsc + lint + `next build` pass; auth paths tested in prod):
- **Paid/free outlet cost** (`outlets.cost`), **delete-project** trash button on
  dashboard cards, **4-family × light/dark theme system** + cross-device
  persistence via `public.profiles` (`ThemeControls` picker; `.panel`/
  `.panel-card`/`.btn-primary`/`.brand-ink`/`.progress-fill` recipe classes).
- **Default theme = Aurora Glass DARK** (`themeInitScript` in `layout.tsx` falls
  back to dark, not OS; a user's saved choice still wins).
- **Auth = Google OAuth + magic link + email/password** (all three in
  `src/app/login/page.tsx`, all land on `/auth/confirm`). Master outlet list is
  already per-user via RLS. Top-bar "Manage outlets" is the single outlet-admin
  entry point (dashboard duplicate button removed).
- **Supabase is fully migrated** (`cost` column + `profiles` table applied);
  Auth URL config points at the vercel.app domain.
- **Admin list sync** (`syncWithAdminMasterList` in `actions.ts`): non-admin
  users can reset their master outlet list to the admin's current list via a 🔄
  banner on `/outlets`. Gated behind `ConfirmModal` (`src/components/ConfirmModal.tsx`
  — reusable themed portal dialog using `.panel`/`btn-primary` recipe classes;
  extended with optional `cancelLabel` + `secondaryAction` props).
- **Prepare page UX** (`OutletSubmit.tsx`): product name is read-only; status
  buttons (Mark submitted / Skip) live in the top action bar; "Save changes"
  button only appears when `isDirty`; no auto-save on blur; unsaved-changes
  navigation guard intercepts in-app link clicks and shows Stay/Discard/Save modal.
  `DeleteProjectButton` uses `ConfirmModal` (not native confirm); delete button
  removed from Edit project form.

Hosting note: do NOT retry Cloudflare — Next 16's `proxy.ts` is forced onto the
Node runtime and OpenNext-Cloudflare doesn't support Node middleware (blocker,
cloudflare/workers-sdk#13755). Vercel runs Next 16 + proxy.ts natively.

Open (polish only): roll the theme recipe classes onto the remaining screens
(Cockpit/OutletSubmit/ProjectForm/`/outlets`/login adopt theme COLORS but not
per-theme surface styling); the 14 curated guide field-maps are still UNVERIFIED
against live submit forms.
