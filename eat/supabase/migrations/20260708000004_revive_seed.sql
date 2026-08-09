-- Dev convenience: revive expired seed promos with a fresh 12-hour window.
-- Real promos are untouched (matches only the fixed seed biz ids).

update promo set
  valid_from = now(),
  valid_to = now() + interval '12 hours',
  status = 'live'
where biz_id in (
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000004',
  'b0000000-0000-0000-0000-000000000005',
  'b0000000-0000-0000-0000-000000000006'
);

update wallet_save set status = 'active', greyed_out_at = null
where status = 'greyed_out'
  and promo_id in (select id from promo where status = 'live');
