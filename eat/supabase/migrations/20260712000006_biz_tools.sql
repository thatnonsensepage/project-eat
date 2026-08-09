-- Biz tools batch (2026-07-12): item price + photo on promos, richer grid payload,
-- owner dashboard stats, photo storage.

-- ---------------------------------------------------------------- promo columns
alter table promo add column price numeric check (price is null or price >= 0);
alter table promo add column photo text;

-- ---------------------------------------------------------------- live_promos v2
-- Return type changes (adds theme/photo/price), so drop + recreate.
drop function if exists live_promos(double precision, double precision);

create function live_promos(p_lat double precision default null, p_lng double precision default null)
returns table (
  id uuid, biz_id uuid, item_name text, deal_type deal_type, deal_value numeric,
  description text, valid_to timestamptz, quota integer, claimed_count integer,
  status promo_status, tags text[], restocked_at timestamptz, created_at timestamptz,
  price numeric, photo text,
  biz_name text, biz_tagline text, halal boolean, cuisine_tags text[], photos text[],
  theme text,
  distance_m double precision
) language sql stable security definer set search_path = public as $$
  select
    p.id, p.biz_id, p.item_name, p.deal_type, p.deal_value, p.description,
    p.valid_to, p.quota, p.claimed_count, p.status, p.tags, p.restocked_at, p.created_at,
    p.price, p.photo,
    b.name, b.tagline, b.halal, b.cuisine_tags, b.photos,
    b.theme,
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

-- ---------------------------------------------------------------- promo editing
-- Members can already UPDATE via RLS; this RPC just validates dates in one place.
create or replace function update_promo(
  p_promo uuid, p_item_name text, p_description text, p_price numeric,
  p_valid_from timestamptz, p_valid_to timestamptz, p_quota integer,
  p_tags text[], p_photo text
) returns void language plpgsql security definer set search_path = public as $$
declare v_biz uuid;
begin
  select biz_id into v_biz from promo where id = p_promo;
  if not is_biz_member(v_biz) then raise exception 'not a member of this business'; end if;
  if p_valid_to <= p_valid_from then raise exception 'end must be after start'; end if;

  update promo set
    item_name = p_item_name,
    description = nullif(p_description, ''),
    price = p_price,
    valid_from = p_valid_from,
    valid_to = p_valid_to,
    quota = p_quota,
    tags = coalesce(p_tags, '{}'),
    photo = nullif(p_photo, ''),
    status = case
      when status = 'expired' and p_valid_to > now() then 'live'::promo_status
      else status end
  where id = p_promo;
end $$;

-- ---------------------------------------------------------------- owner dashboard
-- Everything a stall owner actually wants to know, one call.
-- est_revenue: redeemed × price-after-deal; promos without a price contribute 0.
create or replace function biz_stats(p_biz uuid)
returns table (
  active_promos bigint,
  total_promos bigint,
  waiting_now bigint,
  claimed_total bigint,
  redeemed_total bigint,
  redeemed_today bigint,
  bookmarks bigint,
  est_revenue numeric
) language sql stable security definer set search_path = public as $$
  with effective as (
    select p.*,
      case
        when p.price is null then null
        when p.deal_type = 'percent_off' then p.price * (1 - coalesce(p.deal_value, 0) / 100)
        when p.deal_type = 'flat_off' then greatest(p.price - coalesce(p.deal_value, 0), 0)
        else p.price
      end as paid_price
    from promo p
    where p.biz_id = p_biz
  )
  select
    count(*) filter (where e.status = 'live'),
    count(*),
    (select count(*) from wallet_save w join promo p on p.id = w.promo_id
      where p.biz_id = p_biz and w.status = 'active'),
    coalesce(sum(e.claimed_count), 0),
    coalesce(sum(e.redeemed_count), 0),
    (select count(*) from redemption r
      join wallet_save w on w.id = r.wallet_save_id
      join promo p on p.id = w.promo_id
      where p.biz_id = p_biz and r.redeemed_at >= date_trunc('day', now())),
    (select count(*) from bookmark where biz_id = p_biz),
    coalesce(sum(e.redeemed_count * e.paid_price), 0)
  from effective e
  where is_biz_member(p_biz);
$$;

-- ---------------------------------------------------------------- photo storage
insert into storage.buckets (id, name, public)
values ('promo-photos', 'promo-photos', true)
on conflict (id) do nothing;

create policy promo_photos_read on storage.objects
  for select using (bucket_id = 'promo-photos');

-- path convention: <biz_id>/<filename>; only members of that biz may write
create policy promo_photos_member_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'promo-photos'
    and is_biz_member((split_part(name, '/', 1))::uuid)
  );

create policy promo_photos_member_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'promo-photos'
    and is_biz_member((split_part(name, '/', 1))::uuid)
  );

create policy promo_photos_member_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'promo-photos'
    and is_biz_member((split_part(name, '/', 1))::uuid)
  );
