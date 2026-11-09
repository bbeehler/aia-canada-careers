-- Editable site wording and images. Anyone can read; only admins can change.
create table public.site_content (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null
);

create or replace function public.touch_site_content()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
revoke execute on function public.touch_site_content() from public, anon, authenticated;

create trigger site_content_touch before insert or update on public.site_content
  for each row execute function public.touch_site_content();

alter table public.site_content enable row level security;
create policy "site content is public" on public.site_content for select using (true);
create policy "admins edit site content" on public.site_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Public bucket for site images (hero photo etc.). Only admins can upload or replace.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admins upload site assets" on storage.objects
  for insert to authenticated with check (bucket_id = 'site-assets' and public.is_admin());
create policy "admins update site assets" on storage.objects
  for update to authenticated using (bucket_id = 'site-assets' and public.is_admin());
create policy "admins delete site assets" on storage.objects
  for delete to authenticated using (bucket_id = 'site-assets' and public.is_admin());
