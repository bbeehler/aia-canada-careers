-- New sections for career pages. List-style fields hold one item per line; the province tables use
-- one line per entry with parts separated by |.
alter table public.careers
  add column outlook text not null default '',                 -- e.g. Strong
  add column day_in_life text not null default '',
  add column certifications text not null default '',          -- one per line
  add column red_seal_intro text not null default '',
  add column red_seal text not null default '',                -- Province | Compulsory/Voluntary | duration | hours | note | authority | link
  add column red_seal_note text not null default '',
  add column hs_courses text not null default '',              -- one per line
  add column provincial_programs text not null default '',     -- Province | Program name | description
  add column provincial_programs_note text not null default '',
  add column education_required text not null default '',      -- e.g. Vocational Certificate
  add column education_text text not null default '';
