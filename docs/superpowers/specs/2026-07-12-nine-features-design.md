# Eat — nine-feature batch (approved 2026-07-12)

Approved design, condensed. Owner: Dada. All features build on current bone-white design; external Claude Design reskin happens later and is visual-only.

## 1. Header rebrand
Remove "衣食住行 · phase one · that nonsense company" from `SiteHeader`. Logo becomes **EAT食**, "curate your craving palette" sits beside it. Update `<title>` metadata.

## 2. No-login access (test mode)
Enable Supabase **anonymous sign-ins** (dashboard toggle — manual, one-time). Code auto-calls `signInAnonymously()` when a signed-out user saves/bookmarks/redeems. No login screen. RLS unchanged; anonymous users are real `auth.users` rows so wallet persists per device and crave meter counts them. Login page stays for biz owners/admin email OTP.

## 3. "What other cravers crave?" suggestion tags
Tag chip row under the search studio. Source: `food_category` table (admin-managed) merged with distinct live promo tags. Click chip → runs that search (adds to palette).

## 4. Big Random (NTM) button
Big button in search studio; picks a random food category and runs the search. "NTM" rendered superscript like ™ (NTM = not trademark).

## 5. Clickable biz tags
`cuisine_tags` chips on `/b/[id]` link to `/?q=<tag>`; homepage pre-runs that search on load.

## 6. Biz page themes
`biz.theme` text column, default `bone`. Picker in biz dashboard. Skins the **public** `/b/[id]` page via scoped CSS. Set: `bone` (default), `funny`, `cringe`, `minimal`, `dark`, `kopitiam`, `y2k`. Nonsense DNA encouraged in non-default themes.

## 7. Wallet cards + crave meter
Wallet becomes card grid. Each card shows promo, biz, expiry, redeem CTA, and a **crave meter**: horizontal gradient bar light→dark; position/fill driven by number of `wallet_save` rows for that promo (darker = hotter). Counts exposed via a public-readable view `promo_crave_counts`.

## 8. Admin page
`/admin`, gated by `ADMIN_PASSWORD` env var → signed cookie, checked server-side. Tabs: **Businesses** (list, status), **Food categories** (CRUD, feeds #3/#4), **Wishlist** (see #9). Admin server actions use the service-role client (key in `.env.local`, gitignored).

## 9. Wishlist
Search with zero results → "wish for it →" button, inserts `{term}` into `wishlist` table (anonymous allowed). Admin wishlist tab groups terms with counts for biz sourcing.

## DB migrations (additive only)
- `alter table biz add column theme text not null default 'bone'`
- `create table food_category (id, label, slug unique, active bool, sort int)`
- `create table wishlist (id, term text, created_at)`
- view `promo_crave_counts(promo_id, saves)` counting wallet_save per promo
- RLS: food_category read-all/write-service; wishlist insert-anyone read-service

## Build order
1 → 2 → 3/4/5 → 7 → 8 → 9 → 6
