@AGENTS.md

# LaunchKit

Personal launch-kit + directory-submission tool: prep a project's assets once,
then work a strategy-ordered cockpit of launch directories (per-directory copy,
"open submit page", progress tracking). Assisted, never auto-bot.

## Stack
Next.js 16 (App Router, `src/`, Turbopack) · TypeScript · Tailwind v4 · Supabase
(`@supabase/ssr`: Postgres + Storage + email/password auth). Next 16 uses
`src/proxy.ts` (not middleware.ts) for session refresh.

## Architecture (where things live)
- `src/lib/directories/` — the 582-directory database (`data.json`, generated
  from repo-root `directories.csv`) + loader that computes launch phase and
  overlays curated field-schemas by hostname slug.
- `src/lib/strategy.ts` — the repo's 4-phase Submission Strategy as decision
  rules (P1 DR≥65 free, P2 DR≥65 paid, P3 DR40–64, P4 rest) + `GENERIC_FIELDS`.
- `src/lib/outlets/` — 14 hand-curated outlets with real submit URLs + field
  maps (the "guided" overlay). Still UNVERIFIED — check live forms before trust.
- `src/lib/mapping.ts` — maps the kit into each directory's fields (truncate,
  `{{key}}` templates). `src/lib/data.ts` — Supabase queries. `src/app/actions.ts`
  — server actions. `supabase/schema.sql` — DB schema + RLS.
- Screens: `ProjectForm.tsx` (enter kit once), `Cockpit.tsx` (phase-grouped plan
  + filters), `OutletSubmit.tsx` (per-directory prepare view).

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
