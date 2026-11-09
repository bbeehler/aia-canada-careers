-- Career profiles for the Explore Careers section. Public can read published ones; admins manage all.
-- The eleven starting careers were added directly in Supabase (migration "careers_seed") and are
-- maintained in the app at /admin/careers.
create table public.careers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  sector public.job_sector not null,
  summary text not null,
  description text not null default '',
  tasks text not null default '',        -- one per line
  skills text not null default '',       -- one per line
  training text not null default '',     -- one step per line
  education_level text not null default '',
  salary_range text not null default '', -- e.g. $38K – $100K+
  growth text not null default '',       -- e.g. +5%
  search_terms text not null default '', -- words used to find matching job postings
  sort_order int not null default 100,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_careers()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
revoke execute on function public.touch_careers() from public, anon, authenticated;
create trigger careers_touch before update on public.careers for each row execute function public.touch_careers();

alter table public.careers enable row level security;
create policy "published careers are public" on public.careers for select using (is_published or public.is_admin());
create policy "admins manage careers" on public.careers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
