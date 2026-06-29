# Outlet guide knowledge base

Each `*.json` here is one curated **guide** (the `OutletGuide` type in
`src/lib/types.ts`): a hand-mapped submit form for a known outlet. Guides are
matched against the user's outlets BY HOSTNAME (`homepage`) to power the rich
tap-to-copy "guided" prepare view. They are reference data, not the outlet list
itself (outlets live in Supabase and are user-managed).

## ⚠️ These are SEED configs — verify before trusting

The field lists and character limits were drafted from how each form is known
to look, but forms change constantly. Before you rely on an outlet:

1. Open its `submit_url` in a browser.
2. Confirm each field still exists, its label, and its `max` length.
3. Confirm `requires_login`, `cost` (free vs paid), and any badge/backlink
   requirement noted in `notes`.

## Adding a guide

Drop a new `<id>.json` file in this folder. It's picked up automatically
(`getGuides()` reads the directory) and applied to any outlet whose hostname
matches its `homepage`. No code change needed.

## Field `source` values

`source` maps a directory field to a stored kit field (see `KitFieldKey`).
Fields with no `source` must be filled manually per-outlet.

## Maintenance cadence

Forms drift → configs go stale → bad kits. Re-check each outlet on a light
recurring cadence. This is why the set is kept small and high-value rather
than chasing hundreds of dead directories.
