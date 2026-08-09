# Project 衣食住行 — Master Build Spec

**Phase 1: 食 "Eat"** — product name: **Eat** (see §Character). Craving in, live promo grid out, save to wallet, redeem in-store. Not delivery, not a directory. **Freshness and redemption are the product.**

> Origin: this file began as `claude-code-handover.md`, a translation of the full PRD (`project-yishizhuxing-eat-prd.md`, not on disk — this doc is now self-contained). It has been enriched into the master spec: character, architecture, route map, security, realtime design, scalability path, and metrics added. Original build spec preserved throughout.

---

## 0. The One-Liner

A hungry person in KL opens the app, taps "nasi lemak" or "anything sweet", and sees **what deals are live right now, near them, with live counters of how many people already grabbed them**. They save one, walk in, show their phone, staff taps confirm. Done. The whole loop is under 10 minutes of real life.

The four-phase arc (衣食住行 — clothing, food, shelter, transport) is the long game. Phase 1 proves the loop with food only. Everything in this spec is built so phases 2–4 are a `category` value, not a rewrite.

---

## 1. Character & Brand Voice

This is a **That Nonsense Company** product. The app should feel like the friend who always knows where to eat and never makes a big deal of it — dry, assured, quietly funny. Not a corporate coupon platform, and not a mascot yelling either.

**Voice: calm, classy, wry.** Primarily English, written like a person with taste and a straight face. Humor is understatement and timing, never slapstick, never childish, no exclamation-mark enthusiasm. Manglish appears *sparingly* — a single well-placed "lah" or "habis" lands harder when the rest of the copy is composed.

| Pillar | What it means in UI |
|---|---|
| **Kiasu energy, stated calmly** | Live counters everywhere. "23 claimed. It won't wait." Scarcity is honest, never faked, never shouted. |
| **Deadpan microcopy** | Empty wallet: "Nothing saved. The deals are out there; you are here." Exhausted promo: "Gone. Habis. Bookmark the shop — we'll let you know when they restock." Expired: "This one got away." |
| **Speed as respect** | Biz posts a promo in <60s. User finds a deal in <3 taps. No onboarding tours, no splash screens, no modals begging for ratings. |
| **Street-level, not startup-level** | Photography over illustration. Real stall photos, real prices in MYR. No abstract blob mascots. |

**Naming:** the product is **Eat** — plain, confident, matches the 衣食住行 phase structure (future siblings: Wear, Live, Move). The umbrella brand stays 衣食住行 / That Nonsense Company.

**Language:** UI copy EN-primary with Manglish flavor. Structure all strings through next-intl from day 1 (cheap now) — BM and 中文 packs are P1, not MVP. Do **not** hardcode strings in components.

**Visual direction (for when UI build starts — use `frontend-design` skill then):**
- Mobile-first, thumb-zone actions, bottom nav.
- High-contrast deal cards: item photo, deal badge (BOGO / -30% / RM5 off), live counter, distance. Card is the atomic unit of the whole product.
- Grey-out state must *look* dead (desaturated, "habis" stamp) — the grief of missing a deal is a feature, it trains urgency.
- Dark-mode-friendly palette; most usage is evenings/streets.

---

## 2. Architecture

```
                    ┌─────────────────────────────────────┐
                    │           Next.js (App Router)       │
                    │                                      │
   consumers ──────▶│  /(app)/*      consumer PWA          │
   biz staff ──────▶│  /biz/*        biz dashboard         │
   internal  ──────▶│  /admin/*      ops console (P1)      │
                    │  /api/*        route handlers (thin)  │
                    └──────┬────────────────┬──────────────┘
                           │                │
                    Supabase JS      Supabase Realtime
                           │                │ (live counters, grey-out)
                    ┌──────▼────────────────▼──────────────┐
                    │            Supabase                   │
                    │  Postgres + PostGIS │ Auth (phone OTP)│
                    │  Storage (photos)   │ Edge Functions  │
                    │  pg_cron (purge/expiry jobs)          │
                    └───────────────────────────────────────┘
```

**Stack (unchanged from original recommendation, with additions):**

- **Frontend:** Next.js (App Router) + Tailwind. Mobile-first PWA (manifest + service worker for installability — *not* offline sync, just add-to-home-screen; wallet is useless offline anyway since counters are live).
- **Backend/DB:** Supabase (Postgres + Auth + Storage + Realtime). Realtime is actually useful here, not decorative — live counters (§7) and grey-out states want live updates without polling.
- **Biz dashboard:** same Next.js app, route group `/biz/*`, not a separate codebase — shared components, shared auth, less to maintain.
- **Geo:** PostGIS for proximity queries (nearby biz, 2km radius for Gang matching later). No separate geo service at this scale.
- **AI tag suggestion (P1):** simple Claude API call on item name/description → suggested tags from a controlled vocabulary. Not a custom model, not MVP.
- **Analytics:** self-owned `event` table (see §3) + PostHog or similar later. Don't ship MVP blind — the demand-signal feature *is* analytics, so the events must exist from day 1.

**Don't over-architect.** Single Next.js app, single Supabase project, one Postgres DB. Split services later if/when there's a reason, not preemptively.

**Where the scale ceiling actually is (so we don't bottleneck):**
1. **Live counters** — solved by denormalized `claimed_count` + Realtime broadcast, not COUNT(*) queries. Fine to ~10⁵ concurrent.
2. **Geo grid query** — one PostGIS GiST index. Fine to national scale.
3. **Photo delivery** — Supabase Storage behind its CDN; enforce client-side compression on upload (max ~200KB per photo, 3 photos per biz hard cap already).
4. **The real future bottleneck is organizational, not technical** — multi-category, multi-zone. Both are handled by *schema shape now, logic later* (see §3 notes).

---

## 3. Data Model (Postgres, Supabase)

```
zone                              -- NEW: one row at launch; the multi-city escape hatch
  id, name, center (geography point), radius_km, status (active | planned),
  timezone (default 'Asia/Kuala_Lumpur'), created_at
  -- MVP: exactly one row, hardcode its id in config. No zone-selector UI.
  -- Expansion = INSERT a row + build the selector. No migration.

users
  id, phone_number (primary auth — WhatsApp/SMS OTP, not email, fits MY market),
  display_name (nullable), zone_id (fk, default launch zone),
  created_at, last_active_at, status (active | soft_deleted),
  soft_deleted_at (nullable — see 14-day purge, §5)

biz
  id, zone_id (fk), name, tagline (max ~60 chars),
  category (enum: eat | wear | live | move — default 'eat', ONLY 'eat' valid in P0),
  cuisine_tags (text[]), halal (bool), location (geography point),
  contact_number, photos (max 3, storage refs),
  status (pending | active | paused),        -- 'pending' = awaiting ops approval, anti-spam
  gang_mode_opt_in (bool, default false),
  created_at

biz_member                        -- NEW: staff auth for the dashboard
  id, biz_id (fk), user_id (fk), role (owner | staff), created_at
  -- Owner onboards, adds staff by phone number. Redemption confirm requires membership.

promo
  id, biz_id (fk), item_name,
  deal_type (enum: bogo | percent_off | flat_off | bundle | mystery),
  deal_value, description (short, one line),
  valid_from, valid_to, recurrence (nullable — e.g. "every monday", null = one-off),
  quota (nullable int — null = unlimited),
  claimed_count (int, default 0),
  redeemed_count (int, default 0),
  status (draft | live | paused | exhausted | expired),
  tags (text[] — biz free tags + AI-normalized tags, keep both),
  created_at, restocked_at (nullable — updates on restock, bumps ranking)

wallet_save
  id, user_id (fk), promo_id (fk), saved_at,
  status (active | greyed_out | removed),
  greyed_out_at (nullable — drives the 12hr purge job)
  UNIQUE (user_id, promo_id) WHERE status != 'removed'   -- one live save per user per promo

redemption
  id, wallet_save_id (fk), redeemed_at,
  confirmed_by_member (fk biz_member — WHO confirmed, not just which biz; audit trail)

bookmark
  id, user_id (fk), biz_id (fk), notify_new_promo (bool, default true), created_at

notify_subscription               -- for the paid "re-notify on reopen" feature
  id, user_id (fk), promo_id (fk), opted_in_at, fulfilled_at (nullable)

event                             -- NEW: append-only analytics spine
  id, user_id (nullable fk), biz_id (nullable), promo_id (nullable),
  type (enum: grid_view | card_view | save | unsave | redeem_start |
        redeem_confirm | bookmark | search_filter | restock | biz_signup),
  meta (jsonb), created_at
  -- Powers demand-signal dashboard, ranking, and every future "how is X doing"
  -- question. Insert-only, partitioned by month when it gets big. No PII in meta.

gang (P2 — schema only, don't build the matching job yet)
  id, biz_ids (fk[4]), formed_at, radius_check_passed (bool)

gang_quest_progress (P2)
  id, gang_id (fk), user_id (fk), redemptions_completed (0-4), reward_unlocked_at (nullable)
```

**Notes (original + new):**

- `category` now lives on `biz` (was deliberately absent; original doc flagged adding it later — cheaper to carry a single-value enum from day 1 than migrate). Promos inherit category via `biz_id`; don't duplicate the column onto `promo`.
- `claimed_count` vs `wallet_save` rows: keep both — `claimed_count` on `promo` is a fast denormalized counter for the live meter; `wallet_save` rows are source of truth for per-user state (grey-out, purge timers). **Don't compute the counter with COUNT() on card render.** Increment/decrement atomically in the same transaction as the `wallet_save` write (Postgres function, not two client calls).
- `zone` exists but is invisible in P0 — every insert uses the launch zone id from config. This is the entire multi-city strategy for now.
- `event` is the cheapest table in the schema and the most valuable in six months. Non-negotiable for MVP.

**Indexes that matter:**
- `promo (status, valid_to)` — grid query + expiry cron
- `biz USING GIST (location)` — geo sort
- `promo USING GIN (tags)` — tag filter
- `wallet_save (user_id, status)` — wallet screen
- `wallet_save (greyed_out_at)` partial where status='greyed_out' — purge cron
- `event (type, created_at)` — dashboards

---

## 4. Route Map

```
/(app)                        consumer, phone-OTP auth (browse allowed logged-out,
│                             save/redeem requires auth — lower the front door)
├── /                         the grid: tag filter chips + geo sort + live cards
├── /p/[promoId]              promo detail (shareable URL — WhatsApp virality is free CAC)
├── /b/[bizId]                biz mini-profile: 3 photos, live promos, bookmark button
├── /wallet                   saved deals; greyed-out section at bottom; clear-all
├── /wallet/[saveId]/redeem   full-screen "show this to staff" (big, bright, unmistakable)
└── /me                       phone, notification prefs, delete account (PDPA)

/biz                          biz staff, same auth + biz_member check
├── /biz                      dashboard: live promos, demand signal (active saves per promo)
├── /biz/onboard              5-field form, hard cap (name, tagline, tags+halal, location, photos)
├── /biz/promos/new           THE 60-second flow — most important screen in the product
├── /biz/promos/[id]          edit / pause / restock
└── /biz/redeem               confirm queue: staff sees user's redeem screen, taps confirm

/admin (P1)                   internal ops: approve pending biz, kill spam, zone stats
/api/*                        thin route handlers; all writes via Postgres functions + RLS
```

Public promo/biz URLs are deliberate: a promo card shared into a family WhatsApp group is the growth channel. OG images per promo (item photo + deal badge) — build the OG image route in MVP, it's one file in Next.js and it *is* the marketing.

---

## 5. Core Flows (state machines, not prose)

**Promo lifecycle:**
`draft → live → (exhausted | expired | paused) → [restock → live again]`
- `exhausted`: `claimed_count >= quota` (only if quota set). Enforced in the save transaction — the DB function rejects save #N+1, no oversell race.
- `expired`: `valid_to < now()` — pg_cron sweep every minute, plus a lazy check on read so the grid never shows a stale-live promo between sweeps.
- Restock: increment quota, `status = live`, update `restocked_at` → re-rank + notify bookmarked followers + fulfil `notify_subscription` rows.

**Wallet save lifecycle:**
`active → greyed_out (on promo exhausted/expired) → removed (12h after greyed_out_at)`
- Grey-out happens in the same transaction that exhausts/expires the promo (one UPDATE over wallet_saves), then Realtime broadcasts it — wallets grey out live on screen. This moment is the product's heartbeat; make it instant.
- Scheduled job (pg_cron) checks `greyed_out_at < now() - 12h` → soft-remove row.
- `active → removed` directly on user clear-all — no grey-out step.

**Redemption (MVP = show-and-tell, manual confirm):**
User taps redeem in wallet → full-screen confirmation shown to staff → staff (logged into `/biz/redeem`) taps confirm → transaction: `wallet_save.status = removed`, `promo.redeemed_count += 1`, insert `redemption` with `confirmed_by_member`.
No QR/unique code in MVP — fraud-proofing before volume is wasted effort. The `redemption` audit trail (who confirmed, when) is the cheap insurance that makes upgrading to codes later a UI change, not a data-model change.

**14-day inactivity purge:**
Cron: `last_active_at < now() - 14d` → `status = soft_deleted`, stamp `soft_deleted_at`. Hard-delete job runs on `soft_deleted_at < now() - 7d` (7-day grace — PDPA exposure, confirm with legal before the hard-delete job *ships*, not before build starts). `/me` must expose immediate self-serve delete — same soft-delete path, user-triggered.

---

## 6. Security & RLS (new section — do this at table-creation time, not after)

Row Level Security on from day 1. Retrofitting RLS is misery; writing policies alongside tables is nearly free.

- **users:** row owner read/write self. No enumeration.
- **biz:** public read where `status = 'active'`. Write requires `biz_member` row (owner for profile edits).
- **promo:** public read where `status = 'live'` (plus `exhausted`/`expired` readable for grey-out rendering of saved items). Write via biz membership.
- **wallet_save / bookmark / notify_subscription:** owner-only, both directions.
- **redemption:** insert only via the confirm Postgres function (SECURITY DEFINER); biz members read own biz's rows.
- **event:** insert via RPC only; no client reads (dashboards query server-side).
- **Counters:** `claimed_count`/`redeemed_count` mutate only inside DB functions — clients never UPDATE promo counters directly.

Rate-limit OTP requests per phone (Supabase auth config) — SMS-pump fraud on +60 numbers is a real cost line, cap it before launch, not after the bill.

---

## 7. Realtime Design (new section)

Two live surfaces, both Supabase Realtime, both scoped tight:

1. **Live counter on cards:** broadcast channel per zone (`zone:{id}:promos`), messages are `{promo_id, claimed_count, status}`. Clients on the grid subscribe to one channel, patch counts in place. Do **not** subscribe per card — one channel per zone, tiny payloads.
2. **Wallet grey-out:** postgres_changes subscription on `wallet_save` filtered `user_id = auth.uid()`. When status flips to `greyed_out`, animate the card dying in place. Combined with pillar-1 kiasu energy: watching a deal die in your wallet *because you waited* is the strongest retention lesson the product teaches.

Degradation: if the socket drops, fall back silently to refetch-on-focus. Counters slightly stale beats spinners.

---

## 8. Build Order (P0, in sequence — don't parallelize past what's listed)

0. **Scaffold + rails:** Next.js + Supabase project, CI (typecheck/lint/test on push), all tables + RLS + indexes from §3/§6 in one migration set, seed script with fake biz/promos so the grid never develops against an empty DB. String scaffolding via next-intl (EN pack only).
1. **Auth** (phone OTP, +60 formats) + user/biz tables + biz onboarding form (5 fields, hard cap) + `biz_member` owner row.
2. **Promo CRUD** for biz (post/pause/edit/restock) — the single most important flow; instrument it and keep it under 60 seconds.
3. **Public grid:** structured tag-filter chips + geo sort (skip free-text search). Promo detail + biz mini-profile pages with OG images.
4. **Wallet:** save/remove (atomic counter function), clear-all.
5. **Live social proof meter** — wire Supabase Realtime per §7.
6. **Grey-out + 12h purge cron** + expiry sweep.
7. **Redemption flow:** user-side show-to-staff screen + biz-side confirm queue.
8. **Bookmark-with-notify.**
9. **Demand signal** on biz dashboard (live count of active wallet_saves per promo, backed by `event`).
10. **14-day inactivity cron** + self-serve delete in `/me`.

Each step lands with tests for its DB functions (save/exhaust/redeem transactions especially — that's where the money-shaped bugs live) and a manual walkthrough on a real phone. Step 2 and step 7 get walked through with an actual non-technical human before being called done.

**Everything past this** (free-text NLP search, unique redemption codes, AI tag suggestion, re-notify-on-reopen, Drop campaigns, boosted placement, Gang Redeemed, BM/中文 packs, `/admin`) is P1/P2 — don't start until P0 is live and used by real biz in one zone.

---

## 9. Guardrails (things not to build yet, even if they seem easy)

- No payments/checkout anywhere in this build.
- No POS integration.
- No long-form biz profile fields beyond the capped set — resist scope creep here specifically, it's an easy trap.
- No multi-city logic — the `zone` table exists, the selector doesn't. One hardcoded zone.
- No Gang Redeemed matching engine — schema exists, logic doesn't, until P0 is proven.
- No native apps — PWA only until retention data argues otherwise.
- No push-notification infra beyond what bookmark-notify needs (start with WhatsApp/SMS via the numbers we already have; web push is P1).
- No admin console in P0 — approve pending biz manually in Supabase Studio until it hurts.

---

## 10. Environment Specifics

- Timezone: `Asia/Kuala_Lumpur` for all `valid_from`/`valid_to`/recurrence logic — stored per-zone in the `zone` table, launch zone set to KL. Don't do UTC-naive comparisons; promo validity windows break around midnight otherwise.
- Currency: MYR, display only (no payment processing, so just formatting).
- Phone auth: Malaysian mobile formats (+60); design OTP around that, not generic international.
- Halal flag is first-class in filter UI, not buried — it's a primary decision axis for a large share of the market.

---

## 11. What Success Looks Like (measure from day 1 via `event`)

| Metric | North-star behavior | MVP target (one zone) |
|---|---|---|
| **Save→redeem rate** | The loop actually closes | > 30% of saves redeemed |
| **Promo post time** | Biz can do it standing at the counter | median < 60s |
| **Biz weekly repost rate** | Biz come back without being chased | > 50% post again within 7 days |
| **Time to first save** (new user) | Grid answers the craving fast | < 90s from first open |
| **Grey-out views** | Scarcity is being *witnessed* | tracked, no target — it's the retention engine |

If save→redeem is low, the product is a wishlist app and the model is wrong — find out in one zone, cheap.

---

## 12. Phase 2+ Expansion Map (how 住/行/衣 slot in — read, don't build)

- **New category = new `category` enum value + new tag vocabulary + maybe new `deal_type` values.** Grid, wallet, redemption, bookmarks, counters all carry over untouched — the loop is category-agnostic by design.
- **住 (live):** longer validity windows, quota usually 1, "viewing appointment" may replace walk-in redemption — redemption flow gets a variant, everything else holds.
- **行 (move):** likely partnership-driven (car wash, servicing, fuel) — biz onboarding unchanged.
- **衣 (wear):** closest to food's mechanics; probably second.
- **New zone = INSERT into `zone` + build the selector UI.** That's the whole migration.
- When two categories are live, the grid gets a top-level category switcher — design the grid header with one slot reserved for it now (visual space, no logic).

---

## 13. Deployed Infrastructure (as of 2026-07-12)

- **App code:** `eat/` (Next.js 16 App Router + Tailwind 4 + @supabase/ssr). Note: Next 16 renamed middleware → `proxy.ts`. **Check `eat/node_modules/next/dist/docs/` before writing framework code — APIs differ from training data.**
- **Supabase:** project `eat`, ref `fslrvbpzjfcyqqwpcwtc`, ap-southeast-1. Schema + seed + pg_cron sweeps applied via `eat/supabase/migrations/` (6 migrations through `20260712000006_biz_tools.sql`). DB password: `eat/.db-password.local` (gitignored). The older `tnp-eat` project is a May-2026 prototype kept as archive — don't reuse.
- **Vercel:** project `eat` → **https://eat-seven-beta.vercel.app** (production). Env vars set for prod + preview, including `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_PASSWORD` (production, added 12 Jul). Deploys are **CLI-only from local files** (`vercel --prod` inside `eat/`) — no GitHub remote / git integration yet.
- **Storage:** public bucket `promo-photos`. Path convention `<biz_id>/<uuid>.<ext>`; RLS lets only that biz's members write to their folder, world reads.
- **Spec deviation (deliberate):** exhausted promos do *not* grey existing saves — saves are claims; holders redeem until expiry. Grey-out fires on expiry only.
- **Auth status:** **anonymous sign-ins are ON** (deliberate, test mode) — save/bookmark silently create an anonymous Supabase session via `ensureSession()` in `eat/src/app/actions.ts`; no login wall anywhere. Email OTP works for team addresses (biz owners/admin). Phone OTP still awaits SMS provider (Twilio).
- **Supabase config as code:** `eat/supabase/config.toml` is checked in and pushed with `supabase config push`. ⚠️ **Push clobbers any remote setting not declared in the file with CLI defaults** — it once reset `site_url` and MFA flags (caught, restored). If you change auth settings in the dashboard, mirror them into config.toml. Free tier: keep `[storage.vector] enabled = false`.

## 14. Shipped Since Original Spec (two feature batches, 12 Jul 2026)

Both batches designed in `docs/superpowers/specs/2026-07-12-nine-features-design.md`, commits `cafcd33` + `0eed2c1`.

**Consumer surface:**
- Header brand is **EAT食** + "curate your craving palette". Search-studio homepage: type a craving → results append as sections; palette persists in localStorage across navigation (persist effect is gated by a hydration flag — don't "simplify" that, it guards a wipe race).
- **"What other cravers crave?"** — suggestion chips = `food_category` table (admin-managed) merged with live promos' tags + cuisine tags, shuffled per visit.
- **Big Random Button (NTM)** — full-width, picks a random tag. NTM = not trademark. The joke ships.
- Zero-result searches offer **"wish for it →"** → `wishlist` table (anonymous inserts allowed); admin reviews grouped counts to source new biz.
- **Wallet is a card grid** with a **crave meter** per card — gradient bar fed by `promo_crave_counts` view (aggregate saves only, never who). Hot cap = 20 saves.
- Biz cuisine tags on `/b/[id]` are links back into homepage search (`/?q=<tag>`).

**Biz surface:**
- `/biz` dashboard shows stat tiles via `biz_stats(p_biz)` RPC: live promos, waiting-to-walk-in, redeemed today, est. revenue, totals, bookmarks. **Est. revenue = redeemed × price-after-deal**; promos without `price` contribute zero.
- Promos have `price` (RM, powers revenue) and `photo` (upload to `promo-photos`). Posting form takes **start/end datetimes** (any duration, multi-day fine), not hour presets.
- **Edit** button on every promo → `/biz/promos/[id]/edit` (name, description, price, dates, quota, tags, photo — deal type is fixed; repost to change the deal). Backed by `update_promo` RPC which also re-lives an expired promo if the new end date is in the future.
- **Themes:** `biz.theme` column, picker on the dashboard. Set: `bone` (default) / `minimal` / `funny` / `cringe` / `dark` / `kopitiam` / `y2k`. Themes are full skins — CSS-variable palettes + background patterns + one flying object each (🐓 ✨ 🔥 ☕ 💾). The public `/b/[id]` and `/p/[id]` pages wrap in `.theme-page[data-biz-theme=…]`; homepage promo cards carry the same attribute and inherit palette only. `live_promos` v2 returns `theme`/`photo`/`price` for this. Demo: Uncle Lim = y2k, Bunga Bakery = cringe.

**Admin (`/admin` — live in prod):**
- Gate: `ADMIN_PASSWORD` env var → sha256 cookie scoped to `/admin`. Local + prod password currently `makan-boss` — rotate when it matters.
- Tabs: businesses (status dropdown), food categories (CRUD — feeds chips + Big Random), wishlist (grouped, clearable).
- Admin server actions use the **service-role client** (`eat/src/lib/supabase/admin.ts`) behind the cookie guard. Never import it outside `/admin` actions.

## 15. Working Notes for Agents (read before touching code)

- **Dev server:** `.claude/launch.json` → `npm run dev --prefix eat`, port 3000. `.env.local` + `.db-password.local` live in `eat/` (gitignored) — when working in a fresh git worktree, copy both from the main checkout or the app 500s on boot.
- **DB changes:** new file in `eat/supabase/migrations/`, then `supabase db push -p "$(cat eat/.db-password.local)"`. Project is CLI-linked. Ad-hoc SQL: `supabase db query "…" --linked`.
- **Seed promos self-expire every 12h** (pg_cron sweep). Empty grid ≠ bug. Revive: re-run the UPDATE in `20260708000004_revive_seed.sql`.
- **Writes are RPC-first:** counters and money-shaped mutations live in SECURITY DEFINER Postgres functions (`save_promo`, `unsave_promo`, `confirm_redemption`, `restock_promo`, `update_promo`, `biz_stats`…). Don't add client-side UPDATEs on `promo` counters.
- **Login gates are OFF deliberately** (route level). Enforcement is RLS + anonymous sessions. Don't "fix" by re-adding redirects to `/login`.
- **Brand voice in every string:** calm, classy, dry. Manglish as accent only. If a string sounds like a corporate coupon app, rewrite it.
- **Known lint debt:** a few `set-state-in-effect` warnings from mount-time hydration patterns (opener shuffle, palette restore) — consistent with codebase style, not bugs.

## 16. Open Items (unresolved, not blocking)

- Phone OTP: configure Twilio (or WhatsApp OTP provider — cost per +60 OTP varies wildly) in Supabase auth. Currently email OTP for team + anonymous sessions for everyone else.
- GitHub remote + Vercel git integration — deploys are manual CLI; set up before more than one person ships.
- Rotate `ADMIN_PASSWORD` and consider the email-allowlist upgrade for `/admin` before real biz data accumulates.
- Real biz onboarding in launch zone (Cheras KL, seeded as placeholder) — the actual next product milestone.
- Soft-delete grace window — 7 days working default; confirm with legal before hard-delete ships.
- Name "Eat" — domain/handle availability check before anything public.
- Photo upload compression (client-side, ~200KB cap) — bucket accepts originals today.
