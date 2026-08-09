-- Enable pg_cron and schedule the sweeps (init migration's DO block was a no-op
-- because the extension wasn't enabled yet on the hosted project).

create extension if not exists pg_cron;

select cron.schedule('eat-sweep-expired', '* * * * *', $$select sweep_expired()$$);
select cron.schedule('eat-purge-greyed', '*/10 * * * *', $$select purge_greyed()$$);
select cron.schedule('eat-purge-inactive', '0 3 * * *', $$select purge_inactive()$$);
