-- AIA Canada Careers: initial schema
-- Roles: candidate (job seeker), employer, admin (AIA staff).
-- Posting flow: draft -> (member) pending_review | (non-member) pending_payment -> pending_review
--               -> published (expires after 30 days) | rejected

create extension if not exists pgcrypto;

-- ---------- Types ----------
create type public.user_role as enum ('candidate', 'employer', 'admin');
create type public.job_status as enum ('draft', 'pending_payment', 'pending_review', 'published', 'rejected', 'expired');
create type public.job_sector as enum ('mechanical', 'collision', 'parts_manufacturing', 'business_operations');
create type public.employment_type as enum ('full_time', 'part_time', 'contract', 'apprenticeship', 'co_op', 'seasonal');
create type public.pay_period as enum ('hour', 'year');
create type public.apply_method as enum ('on_site', 'external');

-- ---------- Tables ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'candidate',
  full_name text,
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  website text,
  city text,
  province text,
  -- Membership is set by AIA staff only (later: synced from HubSpot).
  is_member boolean not null default false,
  member_verified_at timestamptz,
  hubspot_company_id text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.company_users (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (company_id, user_id)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  sector public.job_sector not null,
  employment_type public.employment_type not null,
  city text not null,
  province text not null,
  remote_ok boolean not null default false,
  -- Pay range is required (Ontario requires it on public postings).
  pay_min numeric(10,2) not null check (pay_min > 0),
  pay_max numeric(10,2) not null,
  pay_period public.pay_period not null,
  description text not null check (char_length(description) >= 50),
  requirements text,
  icar_training text,          -- training the employer values; links to I-CAR / AIA programs
  uses_ai_screening boolean not null default false,
  is_existing_vacancy boolean not null default true,
  apply_method public.apply_method not null default 'on_site',
  apply_url text,
  status public.job_status not null default 'draft',
  rejection_reason text,
  submitted_at timestamptz,
  paid_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pay_range_valid check (pay_max >= pay_min),
  constraint external_needs_url check (apply_method = 'on_site' or apply_url ~ '^https?://')
);

create index jobs_public_idx on public.jobs (status, expires_at desc);
create index jobs_company_idx on public.jobs (company_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  candidate_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  message text,
  resume_path text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'shortlisted', 'declined')),
  created_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

-- ---------- Helper functions ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_company_user(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.company_users where company_id = cid and user_id = auth.uid());
$$;

-- New sign-ups get a profile. Role comes from sign-up metadata but can never be admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' = 'employer' then 'employer'::public.user_role
         else 'candidate'::public.user_role end,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins can change roles.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only AIA staff can change account roles';
  end if;
  return new;
end $$;

create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Only admins can set membership; the creator is linked to the company automatically.
create or replace function public.protect_company_membership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.is_member := false;
      new.member_verified_at := null;
      new.hubspot_company_id := null;
      new.created_by := auth.uid();
    else
      new.is_member := old.is_member;
      new.member_verified_at := old.member_verified_at;
      new.hubspot_company_id := old.hubspot_company_id;
    end if;
  end if;
  return new;
end $$;

create trigger companies_protect_membership before insert or update on public.companies
  for each row execute function public.protect_company_membership();

create or replace function public.link_company_creator()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.company_users (company_id, user_id) values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end $$;

create trigger companies_link_creator after insert on public.companies
  for each row execute function public.link_company_creator();

-- Employers can only edit drafts and rejected postings, and can't change workflow fields directly.
create or replace function public.protect_job_workflow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if public.is_admin() or current_setting('app.workflow', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.created_by := auth.uid();
    new.submitted_at := null; new.paid_at := null;
    new.published_at := null; new.expires_at := null; new.rejection_reason := null;
  else
    if old.status not in ('draft', 'rejected') then
      raise exception 'This posting can no longer be edited. Contact AIA Canada to make changes.';
    end if;
    new.status := old.status;
    new.submitted_at := old.submitted_at; new.paid_at := old.paid_at;
    new.published_at := old.published_at; new.expires_at := old.expires_at;
    new.company_id := old.company_id; new.created_by := old.created_by;
  end if;
  return new;
end $$;

create trigger jobs_protect_workflow before insert or update on public.jobs
  for each row execute function public.protect_job_workflow();

-- ---------- Workflow actions (called from the app) ----------
create or replace function public.submit_job(job uuid)
returns public.job_status language plpgsql security definer set search_path = public as $$
declare j public.jobs; member boolean; next_status public.job_status;
begin
  select * into j from public.jobs where id = job;
  if j.id is null or not public.is_company_user(j.company_id) then
    raise exception 'Posting not found';
  end if;
  if j.status not in ('draft', 'rejected') then
    raise exception 'This posting has already been submitted';
  end if;
  select is_member into member from public.companies where id = j.company_id;
  next_status := case when member then 'pending_review' else 'pending_payment' end;
  perform set_config('app.workflow', 'on', true);
  update public.jobs set status = next_status, submitted_at = now(), rejection_reason = null where id = job;
  return next_status;
end $$;

create or replace function public.admin_mark_paid(job uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'AIA staff only'; end if;
  update public.jobs set status = 'pending_review', paid_at = now()
  where id = job and status = 'pending_payment';
end $$;

create or replace function public.admin_publish_job(job uuid, days int default 30)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'AIA staff only'; end if;
  update public.jobs set status = 'published', published_at = now(),
    expires_at = now() + make_interval(days => days), rejection_reason = null
  where id = job and status = 'pending_review';
end $$;

create or replace function public.admin_reject_job(job uuid, reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'AIA staff only'; end if;
  update public.jobs set status = 'rejected', rejection_reason = reason
  where id = job and status in ('pending_review', 'pending_payment');
end $$;

revoke execute on function public.submit_job(uuid) from anon;
revoke execute on function public.admin_mark_paid(uuid) from anon;
revoke execute on function public.admin_publish_job(uuid, int) from anon;
revoke execute on function public.admin_reject_job(uuid, text) from anon;

-- ---------- Row level security ----------
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

-- profiles
create policy "read own profile or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "update own profile" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- companies: names are public (they appear on postings)
create policy "companies are public" on public.companies for select using (true);
create policy "employers create companies" on public.companies
  for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('employer', 'admin')));
create policy "company users update company" on public.companies
  for update using (public.is_company_user(id) or public.is_admin());

-- company_users
create policy "see own company links" on public.company_users
  for select using (user_id = auth.uid() or public.is_admin());
create policy "admins manage company links" on public.company_users
  for all using (public.is_admin()) with check (public.is_admin());

-- jobs
create policy "published jobs are public" on public.jobs
  for select using (status = 'published' and expires_at > now());
create policy "company users see their jobs" on public.jobs
  for select using (public.is_company_user(company_id) or public.is_admin());
create policy "company users create jobs" on public.jobs
  for insert to authenticated with check (public.is_company_user(company_id));
create policy "company users edit their jobs" on public.jobs
  for update using (public.is_company_user(company_id) or public.is_admin());
create policy "company users delete drafts" on public.jobs
  for delete using ((public.is_company_user(company_id) and status = 'draft') or public.is_admin());

-- applications
create policy "candidates apply to open jobs" on public.applications
  for insert to authenticated with check (
    candidate_id = auth.uid()
    and exists (select 1 from public.jobs j where j.id = job_id
                and j.status = 'published' and j.expires_at > now() and j.apply_method = 'on_site')
  );
create policy "see own applications" on public.applications
  for select using (candidate_id = auth.uid());
create policy "employers see applications to their jobs" on public.applications
  for select using (exists (select 1 from public.jobs j where j.id = job_id
                            and (public.is_company_user(j.company_id) or public.is_admin())));
create policy "employers update application status" on public.applications
  for update using (exists (select 1 from public.jobs j where j.id = job_id
                            and (public.is_company_user(j.company_id) or public.is_admin())));

-- ---------- Resume storage (private bucket) ----------
-- Files are stored as {candidate_user_id}/{job_id}/{filename}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880,
        array['application/pdf', 'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy "candidates upload own resumes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "candidates read own resumes" on storage.objects
  for select using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "employers read resumes for their jobs" on storage.objects
  for select using (
    bucket_id = 'resumes' and exists (
      select 1 from public.applications a join public.jobs j on j.id = a.job_id
      where a.resume_path = storage.objects.name
        and (public.is_company_user(j.company_id) or public.is_admin())
    )
  );
