-- Optional link from a job posting to the career it matches (used for the "How this pay compares" box).
-- Empty means "Not listed / other"; posting is never blocked on it.
alter table public.jobs add column career_id uuid references public.careers (id) on delete set null;
create index jobs_career_idx on public.jobs (career_id) where career_id is not null;
