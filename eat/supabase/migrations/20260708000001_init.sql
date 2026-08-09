-- Eat (Project 衣食住行 · Phase 1) — initial schema
-- Postgres + PostGIS, Supabase. RLS on from day one; all counter mutations via functions.

create extension if not exists postgis;

-- ---------------------------------------------------------------- enums
create type biz_category as enum ('eat', 'wear', 'live', 'move');
create type biz_status as enum ('pending', 'active', 'paused');
create type member_role as enum ('owner', 'staff');
create type deal_type as enum ('bogo', 'percent_off', 'flat_off', 'bundle', 'mystery');
create type promo_status as enum ('draft', 'live', 'paused', 'exhausted', 'expired');
create type wallet_status as enum ('active', 'greyed_out', 'removed');
create type user_status as enum ('active', 'soft_deleted');
create type event_type as enum (
  'grid_view', 'card_view', 'save', 'unsave', 'redeem_start',
  'redeem_confirm', 'bookmark', 'search_filter', 'restock', 'biz_signup'
);

-- ---------------------------------------------------------------- tables
create table zone (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  center geography(point) not null,
  radius_km numeric not null default 5,
  status text not null default 'active' check (status in ('active', 'planned')),
  timezone text not null default 'Asia/Kuala_Lumpur',
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone_number text,
  display_name text,
  zone_id uuid references zone(id),
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  status user_status not null default 'active',
  soft_deleted_at timestamptz
);

create table biz (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zone(id),
  name text not null,
  tagline text check (char_length(tagline) <= 60),
  category biz_category not null default 'eat',
  cuisine_tags text[] not null default '{}',
  halal boolean not null default false,
  location geography(point) not null,
  contact_number text,
  photos text[] not null default '{}' check (cardinality(photos) <= 3),
  status biz_status not null default 'pending',
  gang_mode_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create table biz_member (
  id uuid primary key default gen_random_uuid(),
  biz_id uuid not null references biz(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role member_role not null default 'staff',
  created_at timestamptz not null default now(),
  unique (biz_id, user_id)
);

create table promo (
  id uuid primary key default gen_random_uuid(),
  biz_id uuid not null references biz(id) on delete cascade,
  item_name text not null,
  deal_type deal_type not null,
  deal_value numeric,
  description text,
  valid_from timestamptz not null default now(),
  valid_to timestamptz not null,
  recurrence text,
  quota integer check (quota is null or quota > 0),
  claimed_count integer not null default 0,
  redeemed_count integer not null default 0,
  status promo_status not null default 'draft',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  restocked_at timestamptz
);

create table wallet_save (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  promo_id uuid not null references promo(id) on delete cascade,
  saved_at timestamptz not null default now(),
  status wallet_status not null default 'active',
  greyed_out_at timestamptz
);
-- one live save per user per promo
create unique index wallet_save_one_live
  on wallet_save (user_id, promo_id) where status != 'removed';

create table redemption (
  id uuid primary key default gen_random_uuid(),
  wallet_save_id uuid not null references wallet_save(id),
  redeemed_at timestamptz not null default now(),
  confirmed_by_member uuid not null references biz_member(id)
);

create table bookmark (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  biz_id uuid not null references biz(id) on delete cascade,
  notify_new_promo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, biz_id)
);

create table notify_subscription (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  promo_id uuid not null references promo(id) on delete cascade,
  opted_in_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  unique (user_id, promo_id)
);

create table event (
  id bigint generated always as identity primary key,
  user_id uuid,
  biz_id uuid,
  promo_id uuid,
  type event_type not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- P2: schema only, no logic
create table gang (
  id uuid primary key default gen_random_uuid(),
  biz_ids uuid[] not null,
  formed_at timestamptz not null default now(),
  radius_check_passed boolean not null default false
);

create table gang_quest_progress (
  id uuid primary key default gen_random_uuid(),
  gang_id uuid not null references gang(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  redemptions_completed integer not null default 0 check (redemptions_completed between 0 and 4),
  reward_unlocked_at timestamptz
);

-- ---------------------------------------------------------------- indexes
create index promo_grid_idx on promo (status, valid_to);
create index promo_tags_idx on promo using gin (tags);
create index promo_biz_idx on promo (biz_id);
create index biz_location_idx on biz using gist (location);
create index wallet_user_idx on wallet_save (user_id, status);
create index wallet_greyed_idx on wallet_save (greyed_out_at) where status = 'greyed_out';
create index event_type_time_idx on event (type, created_at);

-- ---------------------------------------------------------------- auth mirror
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, phone_number)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------- helpers
create or replace function is_biz_member(p_biz uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from biz_member where biz_id = p_biz and user_id = auth.uid());
$$;

create or replace function touch_last_active()
returns void language sql security definer set search_path = public as $$
  update users set last_active_at = now() where id = auth.uid();
$$;

-- ---------------------------------------------------------------- core functions
-- Save: atomic claim. Rejects when not live, out of window, or quota full.
-- Flips promo to 'exhausted' when this save takes the last slot.
create or replace function save_promo(p_promo uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_promo promo%rowtype;
  v_save_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;

  select * into v_promo from promo where id = p_promo for update;
  if not found then raise exception 'promo not found'; end if;
  if v_promo.status != 'live' then raise exception 'promo is not live'; end if;
  if now() < v_promo.valid_from or now() > v_promo.valid_to then
    raise exception 'promo outside validity window';
  end if;
  if v_promo.quota is not null and v_promo.claimed_count >= v_promo.quota then
    update promo set status = 'exhausted' where id = p_promo;
    raise exception 'promo exhausted';
  end if;

  insert into wallet_save (user_id, promo_id)
  values (auth.uid(), p_promo)
  returning id into v_save_id;

  update promo set
    claimed_count = claimed_count + 1,
    status = case
      when quota is not null and claimed_count + 1 >= quota then 'exhausted'::promo_status
      else status end
  where id = p_promo;

  insert into event (user_id, promo_id, biz_id, type)
  values (auth.uid(), p_promo, v_promo.biz_id, 'save');
  perform touch_last_active();
  return v_save_id;
end $$;

-- Unsave: releases the claim; can un-exhaust a promo still inside its window.
create or replace function unsave_promo(p_save uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_save wallet_save%rowtype;
begin
  select * into v_save from wallet_save
    where id = p_save and user_id = auth.uid() and status = 'active' for update;
  if not found then raise exception 'save not found'; end if;

  update wallet_save set status = 'removed' where id = p_save;
  update promo set
    claimed_count = greatest(claimed_count - 1, 0),
    status = case
      when status = 'exhausted' and valid_to > now() then 'live'::promo_status
      else status end
  where id = v_save.promo_id;

  insert into event (user_id, promo_id, type) values (auth.uid(), v_save.promo_id, 'unsave');
end $$;

-- Clear-all: user-triggered, straight to removed (no grey-out step).
create or replace function clear_wallet()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id from wallet_save where user_id = auth.uid() and status in ('active','greyed_out') loop
    begin
      perform unsave_promo(r.id);
    exception when others then
      update wallet_save set status = 'removed' where id = r.id;
    end;
  end loop;
end $$;

-- Redemption confirm: caller must be a member of the promo's biz.
create or replace function confirm_redemption(p_save uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_save wallet_save%rowtype;
  v_biz uuid;
  v_member uuid;
begin
  select * into v_save from wallet_save where id = p_save and status = 'active' for update;
  if not found then raise exception 'save not active'; end if;

  select biz_id into v_biz from promo where id = v_save.promo_id;
  select id into v_member from biz_member where biz_id = v_biz and user_id = auth.uid();
  if v_member is null then raise exception 'not a member of this business'; end if;

  update wallet_save set status = 'removed' where id = p_save;
  update promo set redeemed_count = redeemed_count + 1 where id = v_save.promo_id;
  insert into redemption (wallet_save_id, confirmed_by_member) values (p_save, v_member);
  insert into event (user_id, promo_id, biz_id, type)
  values (v_save.user_id, v_save.promo_id, v_biz, 'redeem_confirm');
end $$;

-- Restock: bump quota, relive, re-rank, fulfil notify subscriptions.
create or replace function restock_promo(p_promo uuid, p_add integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_biz uuid;
begin
  select biz_id into v_biz from promo where id = p_promo;
  if not is_biz_member(v_biz) then raise exception 'not a member of this business'; end if;
  if p_add is null or p_add <= 0 then raise exception 'restock amount must be positive'; end if;

  update promo set
    quota = coalesce(quota, 0) + p_add,
    status = 'live',
    restocked_at = now()
  where id = p_promo;

  update notify_subscription set fulfilled_at = now()
  where promo_id = p_promo and fulfilled_at is null;

  insert into event (user_id, promo_id, biz_id, type)
  values (auth.uid(), p_promo, v_biz, 'restock');
end $$;

-- Grid query: live promos with distance, freshness-ranked.
create or replace function live_promos(p_lat double precision default null, p_lng double precision default null)
returns table (
  id uuid, biz_id uuid, item_name text, deal_type deal_type, deal_value numeric,
  description text, valid_to timestamptz, quota integer, claimed_count integer,
  status promo_status, tags text[], restocked_at timestamptz, created_at timestamptz,
  biz_name text, biz_tagline text, halal boolean, cuisine_tags text[], photos text[],
  distance_m double precision
) language sql stable security definer set search_path = public as $$
  select
    p.id, p.biz_id, p.item_name, p.deal_type, p.deal_value, p.description,
    p.valid_to, p.quota, p.claimed_count, p.status, p.tags, p.restocked_at, p.created_at,
    b.name, b.tagline, b.halal, b.cuisine_tags, b.photos,
    case when p_lat is null then null
         else st_distance(b.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
    end as distance_m
  from promo p
  join biz b on b.id = p.biz_id
  where p.status = 'live'
    and now() between p.valid_from and p.valid_to
    and b.status = 'active'
  order by
    case when p_lat is null then 0 else st_distance(b.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) end asc,
    greatest(p.restocked_at, p.created_at) desc;
$$;

-- Demand signal: active saves per promo for one biz.
create or replace function biz_demand(p_biz uuid)
returns table (promo_id uuid, item_name text, status promo_status, active_saves bigint,
               claimed_count integer, redeemed_count integer, quota integer, valid_to timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.item_name, p.status,
         count(w.id) filter (where w.status = 'active'),
         p.claimed_count, p.redeemed_count, p.quota, p.valid_to
  from promo p
  left join wallet_save w on w.promo_id = p.id
  where p.biz_id = p_biz and is_biz_member(p_biz)
  group by p.id
  order by p.created_at desc;
$$;

-- Staff-side redeem queue: active saves on this biz's promos.
-- Security definer because wallet_save is owner-read-only; membership is the gate.
create or replace function biz_redeem_queue(p_biz uuid)
returns table (save_id uuid, item_name text, deal_type deal_type, deal_value numeric,
               saved_at timestamptz, user_phone text)
language sql stable security definer set search_path = public as $$
  select w.id, p.item_name, p.deal_type, p.deal_value, w.saved_at,
         coalesce('···' || right(u.phone_number, 4), 'unknown')
  from wallet_save w
  join promo p on p.id = w.promo_id
  join users u on u.id = w.user_id
  where p.biz_id = p_biz and w.status = 'active' and is_biz_member(p_biz)
  order by w.saved_at desc;
$$;

create or replace function log_event(p_type event_type, p_promo uuid default null,
                                     p_biz uuid default null, p_meta jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into event (user_id, promo_id, biz_id, type, meta)
  values (auth.uid(), p_promo, p_biz, p_type, p_meta);
$$;

-- Biz onboarding: creates biz (pending) + owner membership in one call.
create or replace function onboard_biz(
  p_name text, p_tagline text, p_tags text[], p_halal boolean,
  p_lat double precision, p_lng double precision, p_contact text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_zone uuid; v_biz uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into v_zone from zone where status = 'active' order by created_at limit 1;

  insert into biz (zone_id, name, tagline, cuisine_tags, halal, location, contact_number, status)
  values (v_zone, p_name, p_tagline, coalesce(p_tags, '{}'), coalesce(p_halal, false),
          st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_contact, 'active')
  returning id into v_biz;
  -- note: 'active' for MVP velocity; flip default to 'pending' when spam appears.

  insert into biz_member (biz_id, user_id, role) values (v_biz, auth.uid(), 'owner');
  insert into event (user_id, biz_id, type) values (auth.uid(), v_biz, 'biz_signup');
  return v_biz;
end $$;

-- ---------------------------------------------------------------- sweeps (called by cron)
-- Expiry: promos past valid_to die; their active saves grey out (12h countdown starts).
create or replace function sweep_expired()
returns void language plpgsql security definer set search_path = public as $$
begin
  with dead as (
    update promo set status = 'expired'
    where status in ('live', 'exhausted', 'paused') and valid_to < now()
    returning id
  )
  update wallet_save set status = 'greyed_out', greyed_out_at = now()
  where promo_id in (select id from dead) and status = 'active';
end $$;

-- Purge: greyed saves older than 12h are removed.
create or replace function purge_greyed()
returns void language sql security definer set search_path = public as $$
  update wallet_save set status = 'removed'
  where status = 'greyed_out' and greyed_out_at < now() - interval '12 hours';
$$;

-- Inactivity: 14d idle -> soft delete; 7d grace -> hard delete.
create or replace function purge_inactive()
returns void language plpgsql security definer set search_path = public as $$
begin
  update users set status = 'soft_deleted', soft_deleted_at = now()
  where status = 'active' and last_active_at < now() - interval '14 days';
  delete from auth.users where id in (
    select id from users where status = 'soft_deleted' and soft_deleted_at < now() - interval '7 days'
  );
end $$;

-- Schedule sweeps if pg_cron is available (hosted Supabase: enable in dashboard).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('eat-sweep-expired', '* * * * *', $job$select sweep_expired()$job$);
    perform cron.schedule('eat-purge-greyed', '*/10 * * * *', $job$select purge_greyed()$job$);
    perform cron.schedule('eat-purge-inactive', '0 3 * * *', $job$select purge_inactive()$job$);
  end if;
end $$;

-- ---------------------------------------------------------------- RLS
alter table zone enable row level security;
alter table users enable row level security;
alter table biz enable row level security;
alter table biz_member enable row level security;
alter table promo enable row level security;
alter table wallet_save enable row level security;
alter table redemption enable row level security;
alter table bookmark enable row level security;
alter table notify_subscription enable row level security;
alter table event enable row level security;
alter table gang enable row level security;
alter table gang_quest_progress enable row level security;

create policy zone_public_read on zone for select using (true);

create policy users_self_read on users for select using (id = auth.uid());
create policy users_self_update on users for update using (id = auth.uid());

create policy biz_public_read on biz for select
  using (status = 'active' or is_biz_member(id));
create policy biz_member_update on biz for update using (is_biz_member(id));

create policy biz_member_read on biz_member for select
  using (user_id = auth.uid() or is_biz_member(biz_id));
create policy biz_member_owner_insert on biz_member for insert
  with check (exists (select 1 from biz_member m
                      where m.biz_id = biz_member.biz_id
                        and m.user_id = auth.uid() and m.role = 'owner'));

-- live promos public; exhausted/expired readable so saved cards can render their death
create policy promo_public_read on promo for select
  using (status in ('live', 'exhausted', 'expired') or is_biz_member(biz_id));
create policy promo_member_insert on promo for insert with check (is_biz_member(biz_id));
create policy promo_member_update on promo for update using (is_biz_member(biz_id));
create policy promo_member_delete on promo for delete
  using (is_biz_member(biz_id) and status = 'draft');

create policy wallet_owner_read on wallet_save for select using (user_id = auth.uid());
-- writes only via functions (security definer); redeem screen read for biz handled by function

create policy redemption_biz_read on redemption for select
  using (exists (select 1 from wallet_save w join promo p on p.id = w.promo_id
                 where w.id = wallet_save_id and is_biz_member(p.biz_id)));

create policy bookmark_owner_all on bookmark for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notify_owner_all on notify_subscription for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- event: no client reads, no direct writes (log_event RPC only)

-- ---------------------------------------------------------------- realtime
alter publication supabase_realtime add table promo;
alter publication supabase_realtime add table wallet_save;
