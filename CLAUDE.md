# Project 衣食住行 — root context

This folder is the project root. Read [CONTEXT.md](CONTEXT.md) first — status, links,
owner, next action.

## Layout

- `eat/` — the actual Next.js app (phase 1, "Eat"). Has its own `CLAUDE.md` /
  `AGENTS.md` — **when working inside `eat/`, that AGENTS.md's warning applies:
  this is Next.js 16, APIs differ from training data, check
  `eat/node_modules/next/dist/docs/` before writing framework code.**
- `md/claude-code-handover.md` — the living build spec: data model, RLS
  policies, realtime design, route map, build order, brand voice, deployed
  infra, open items. Read before making architectural changes.
- `.claude/launch.json` — dev server config (`npm run dev --prefix eat`, port 3000).
  Dev runs on webpack (`next dev --webpack`): Turbopack 16.2 panics when the
  folder path contains CJK characters (衣食住行/食). Vercel builds are unaffected.

## Deployed infra (see CONTEXT.md + handover doc §13 for full detail)

- Supabase project `eat`, ref `fslrvbpzjfcyqqwpcwtc`, ap-southeast-1. DB
  password in `eat/.db-password.local` (gitignored — not in repo history).
- Vercel project `eat` → https://eat-seven-beta.vercel.app
- Older Supabase project `tnp-eat` is an unrelated archived prototype — do not touch.

## Working conventions

- Brand voice: calm, classy, dry-witty English. Manglish sparingly, as accent only.
- Login gates are currently off across all routes (deliberate, temporary) — writes
  (save/redeem/post) are still enforced via Supabase RLS, not route guards.
- Don't commit `.env.local`, `.db-password.local`, or anything under
  `eat/supabase/.temp/` — all gitignored already.
