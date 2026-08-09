-- Eat seed: one zone (Cheras, KL), six businesses, a spread of live promos.
-- Dev-only. Businesses have no owners; claim one by inserting a biz_member row for your user.

insert into zone (id, name, center, radius_km) values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Cheras', st_setsrid(st_makepoint(101.7405, 3.0738), 4326)::geography, 5)
on conflict do nothing;

-- fixed ids so the seed is idempotent-ish for dev
do $$
declare
  v_zone uuid;
  b1 uuid := 'b0000000-0000-0000-0000-000000000001';
  b2 uuid := 'b0000000-0000-0000-0000-000000000002';
  b3 uuid := 'b0000000-0000-0000-0000-000000000003';
  b4 uuid := 'b0000000-0000-0000-0000-000000000004';
  b5 uuid := 'b0000000-0000-0000-0000-000000000005';
  b6 uuid := 'b0000000-0000-0000-0000-000000000006';
begin
  select id into v_zone from zone limit 1;

  insert into biz (id, zone_id, name, tagline, cuisine_tags, halal, location, contact_number, status) values
    (b1, v_zone, 'Nasi Lemak Warisan', 'Sambal made at 5am, gone by noon', '{malay,nasi lemak,breakfast}', true,  st_setsrid(st_makepoint(101.7411, 3.0741), 4326)::geography, '+60123450001', 'active'),
    (b2, v_zone, 'Kopi & Sons', 'Third-generation kopitiam, first-generation wifi', '{kopitiam,coffee,toast}', false, st_setsrid(st_makepoint(101.7392, 3.0725), 4326)::geography, '+60123450002', 'active'),
    (b3, v_zone, 'Restoran Mei Hua', 'Wok hei you can hear from the street', '{chinese,zi char,noodles}', false, st_setsrid(st_makepoint(101.7430, 3.0752), 4326)::geography, '+60123450003', 'active'),
    (b4, v_zone, 'Thali House', 'Banana leaf. Both hands. No regrets.', '{indian,banana leaf,vegetarian}', false, st_setsrid(st_makepoint(101.7378, 3.0710), 4326)::geography, '+60123450004', 'active'),
    (b5, v_zone, 'Bunga Bakery', 'Butter is a food group here', '{bakery,dessert,pastry}', true, st_setsrid(st_makepoint(101.7419, 3.0729), 4326)::geography, '+60123450005', 'active'),
    (b6, v_zone, 'Uncle Lim Chicken Rice', 'One dish. Forty years. Still queueing.', '{chinese,chicken rice,lunch}', false, st_setsrid(st_makepoint(101.7401, 3.0748), 4326)::geography, '+60123450006', 'active')
  on conflict (id) do nothing;

  insert into promo (biz_id, item_name, deal_type, deal_value, description, valid_from, valid_to, quota, status, tags) values
    (b1, 'Nasi Lemak Ayam Goreng', 'percent_off', 30, 'The morning batch, 30% off after 11am', now() - interval '1 hour', now() + interval '5 hours', 20, 'live', '{nasi lemak,malay,lunch}'),
    (b1, 'Sambal Sotong Set',      'bundle',      15, 'Set + iced tea, RM15 flat',            now() - interval '1 hour', now() + interval '8 hours', 10, 'live', '{malay,seafood,set}'),
    (b2, 'Kaya Toast + Kopi C',    'flat_off',     3, 'RM3 off the classic pairing',          now() - interval '2 hours', now() + interval '6 hours', null, 'live', '{kopitiam,breakfast,coffee}'),
    (b3, 'Wat Tan Hor (L)',        'bogo',      null, 'Buy one large, second plate free. Bring a friend or don''t — we won''t judge.', now(), now() + interval '4 hours', 8, 'live', '{chinese,noodles,dinner}'),
    (b4, 'Banana Leaf Set',        'percent_off', 25, 'Full set, 25% off before 3pm',         now() - interval '1 hour', now() + interval '3 hours', 15, 'live', '{indian,banana leaf,lunch}'),
    (b5, 'Mystery Pastry Box',     'mystery',     10, 'Five pastries. RM10. We choose, you trust.', now(), now() + interval '7 hours', 12, 'live', '{bakery,dessert,mystery}'),
    (b6, 'Chicken Rice + Soup',    'flat_off',     2, 'RM2 off, because Tuesday',             now() - interval '30 minutes', now() + interval '5 hours', 30, 'live', '{chinese,chicken rice,lunch}'),
    (b5, 'Butter Croissant Dozen', 'percent_off', 40, 'Yesterday''s dozen was gone in an hour', now() - interval '3 hours', now() - interval '1 hour', 6, 'expired', '{bakery,pastry}');
end $$;
