-- Featured postings appear in the Featured Careers block on the home page.
-- Employers choose it while the posting is a draft. Free for members; non-members pay for it
-- with the posting (covered by the same "Mark paid" step in the review queue).
alter table public.jobs add column is_featured boolean not null default false;
create index jobs_featured_idx on public.jobs (is_featured, status, expires_at desc) where is_featured;
