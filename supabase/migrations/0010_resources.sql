-- Resources page links. Applied in Supabase as migration "resources", which also added the nine
-- starting resources. Super admins manage them at /admin/resources.
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  url text not null default '',
  kind text not null default 'website' check (kind in ('organization', 'website', 'program', 'guide')),
  audience text not null default 'both' check (audience in ('students', 'parents', 'both')),
  sort_order int not null default 100,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.resources enable row level security;
create policy "published resources are public" on public.resources for select using (is_published or public.is_super_admin());
create policy "super admins manage resources" on public.resources for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
