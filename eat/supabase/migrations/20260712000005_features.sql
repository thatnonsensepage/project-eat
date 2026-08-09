-- Nine-feature batch (2026-07-12): biz themes, food categories, wishlist, crave counts.

-- ---------------------------------------------------------------- biz themes
alter table biz add column theme text not null default 'bone'
  check (theme in ('bone', 'funny', 'cringe', 'minimal', 'dark', 'kopitiam', 'y2k'));

-- ---------------------------------------------------------------- food categories
-- Feeds the "What other cravers crave?" row and the Big Random (NTM) button.
-- Admin-managed (service role); public read.
create table food_category (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 40),
  slug text not null unique,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

alter table food_category enable row level security;
create policy food_category_public_read on food_category for select using (active);
-- writes: service role only (bypasses RLS)

insert into food_category (label, slug, sort) values
  ('nasi lemak', 'nasi-lemak', 1),
  ('chicken rice', 'chicken-rice', 2),
  ('laksa', 'laksa', 3),
  ('roti canai', 'roti-canai', 4),
  ('dim sum', 'dim-sum', 5),
  ('banana leaf', 'banana-leaf', 6),
  ('burger', 'burger', 7),
  ('bubble tea', 'bubble-tea', 8),
  ('dessert', 'dessert', 9),
  ('western', 'western', 10);

-- ---------------------------------------------------------------- wishlist
-- Zero-result searches land here; admin reads them to source new biz.
create table wishlist (
  id uuid primary key default gen_random_uuid(),
  term text not null check (char_length(term) between 1 and 80),
  created_at timestamptz not null default now()
);

alter table wishlist enable row level security;
create policy wishlist_anyone_insert on wishlist for insert with check (true);
-- reads: service role only (admin page)

-- ---------------------------------------------------------------- crave meter
-- Aggregate saves per promo, publicly readable. View owner bypasses wallet_save
-- RLS deliberately: exposes only (promo_id, count), never who saved.
create view promo_crave_counts as
  select promo_id, count(*) filter (where status = 'active') as saves
  from wallet_save
  group by promo_id;

grant select on promo_crave_counts to anon, authenticated;
