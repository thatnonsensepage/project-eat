# CONTEXT.md — Project 衣食住行 (Eat)

**Purpose:** Live-deal discovery app for F&B, phase one of a 衣食住行 (clothing/food/shelter/transport) product family. Craving in, live promo grid out, save to wallet, redeem in-store. Not delivery, not a directory — freshness and redemption are the product.
**Owner:** Dada
**Status:** Building — MVP live, pre-monetization
**Last updated:** 08 Jul 2026

**Key links:**
- Brief / build spec: [md/claude-code-handover.md](md/claude-code-handover.md) — full architecture, data model, build order, brand voice
- Linear project: none yet
- GitHub repo: not yet pushed to a remote (local git history lives in the previous location; see Notes)
- Live URL: https://eat-seven-beta.vercel.app
- Supabase project: `eat`, ref `fslrvbpzjfcyqqwpcwtc`, ap-southeast-1 (older `tnp-eat` project is an unrelated May-2026 prototype, kept as archive, do not reuse)
- Vercel project: `eat` under account vincent-2957
- Finance Sheet row: n/a (not yet monetizing)

**Next action:** Configure Supabase auth SMS provider (Twilio) for real phone OTP; currently email OTP only for team addresses. Then get real biz onboarded in one launch zone (Cheras, KL, seeded as placeholder).

---

## Notes

**Stack:** Next.js 16 (App Router — note: middleware is called `proxy.ts` in this version) + Tailwind 4 + Supabase (Postgres/PostGIS, Auth, Realtime, pg_cron). Deployed on Vercel.

**Folder moved 08 Jul 2026** from `Desktop/That Nonsense Company/Project/Project衣食住行` (inside the old `That Nonsense Company` git repo) to this location, which is not yet a git repo. Git history did not follow — the old repo still has the commit history for this project's first 55 files (`git log` there under the old path if ever needed). This folder should get its own fresh git init + GitHub remote before the next commit.

**What's in this folder:**
- `eat/` — the Next.js app (source, migrations, seed data). `.env.local` has real Supabase keys, gitignored.
- `md/claude-code-handover.md` — the living build spec: data model, RLS policies, realtime design, route map, build order, brand voice, deployed-infra log, open items.
- `.claude/launch.json` — dev server config (`npm run dev --prefix eat`, port 3000).

**Brand voice:** calm, classy, dry-witty English; Manglish used sparingly as accent only. Product name is simply "Eat" (siblings later: Wear, Live, Move). See handover doc §1.

**Design direction:** bone-white editorial (siberia.es-inspired) — huge Fraunces italic type, thin black rules, mono labels, chili-red accent. Homepage is a "curate your craving palette" search studio: type what you're craving, results append below as sections, with a rolling 10-item search history (gradient-orb or biz-photo thumbnails, dotted rows).

**Current auth state:** login gates removed from all routes for now (per explicit instruction) — everything is viewable anonymously; writes (save/redeem/post) still require sign-in, enforced at the RLS layer, not at the route layer. `/biz` shows a read-only demo view of the first seeded business when signed out.
