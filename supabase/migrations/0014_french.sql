-- Applied in Supabase as migration "french". French support:
-- * site_content gets a lang column ('en' | 'fr'); primary key is now (key, lang).
-- * careers and resources get a translations column: {"fr": {"title": "...", ...}}. Blank French falls back to English.
-- * jobbank_wages gets noc_title_fr and region_name_fr (Job Bank's own French names).
-- French career and resource text was loaded directly in Supabase and is maintained in the editors.
alter table public.site_content add column lang text not null default 'en' check (lang in ('en', 'fr'));
alter table public.site_content drop constraint site_content_pkey;
alter table public.site_content add primary key (key, lang);
alter table public.careers add column translations jsonb not null default '{}'::jsonb;
alter table public.resources add column translations jsonb not null default '{}'::jsonb;
alter table public.jobbank_wages add column noc_title_fr text, add column region_name_fr text;
