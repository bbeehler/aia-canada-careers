-- Latest Statistics Canada earnings for auto care industries (refreshed daily by the statcan-wages function)
create table public.statcan_wages (
  id text primary key default 'latest',
  fetched_at timestamptz not null default now(),
  data jsonb not null
);
alter table public.statcan_wages enable row level security;
create policy "statcan wages are public" on public.statcan_wages for select using (true);

-- Daily at 09:30 UTC (4:30 a.m. Eastern)
select cron.schedule(
  'daily-statcan-wages',
  '30 9 * * *',
  $cron$
    select net.http_post(
      url := 'https://khpheoilykzbavvphixr.supabase.co/functions/v1/statcan-wages',
      headers := jsonb_build_object('Content-Type', 'application/json',
                   'x-cron-secret', (select value from public.app_secrets where name = 'cron_secret')),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$
);
