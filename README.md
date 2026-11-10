# Careers in Auto Care

A job board from AIA Canada (Automotive Industries Association of Canada).

The job board for Canada's automotive aftermarket. Employers post jobs in mechanical repair,
collision repair, parts and manufacturing, and business operations. AIA Canada members post free;
non-members pay per posting. AIA staff review every posting before it goes live.

**Stack:** React + Vite + Tailwind (front end, hosted on Cloudflare Pages), Supabase (database,
sign-in, resume storage), GitHub (code). Payments for non-members use a HubSpot payment link.

## How it works

| Who | What they can do |
| --- | --- |
| Job seekers (16+) | Search and filter jobs, apply with a resume, see their applications |
| Employers | Add their company, write postings, submit them, review applicants and resumes |
| AIA staff (admin) | Publish or send back postings, mark payments received, mark companies as members |

Posting flow: **Draft → Submit → (non-members) Awaiting payment → In review → Live for 30 days.**
Members skip the payment step. All of this is enforced in the database, not just the app, so
employers can't publish their own postings or mark themselves as members.

**Featured postings** appear in the Featured Careers block on the home page. Employers turn it on
while writing a posting. It's free for members; non-members pay for it together with the posting,
using a second HubSpot payment link (`VITE_NONMEMBER_FEATURED_PAYMENT_URL`). Staff can also add or
remove featured status from the review queue.

Each posting collects a pay range, whether it's a current vacancy, and whether AI is used in
screening, so postings meet Ontario's job posting rules.

## Roles

| Role | Can do |
| --- | --- |
| Job seeker | Apply to jobs, track applications |
| Employer | Post jobs and review applicants for their company |
| AIA staff | Review queue: publish postings, confirm payments, manage companies and membership |
| Super admin | Everything staff can do, plus Site content, Careers, and Users and roles |

Super admins manage people at **Users**: add a person (creates their account and gives you an invite
link to send, or emails it once email sending is set up), edit names and emails, change roles,
connect employers to companies, create password reset links, and delete accounts. You can't delete
yourself or remove the last super admin. Deleting someone keeps the companies and postings they created.
Everyone can update their own name and password at **My account**.

## Membership (Insightly)

When an employer adds their company, the site asks the `check-membership` Supabase Edge Function to
look them up in Insightly: first by an Insightly contact with the employer's exact email, then by an
organisation with the same name whose website or email domain matches the employer's work email.
Members are switched to free posting automatically. Staff can re-run the check from the Companies tab,
and employers from their dashboard. Personal email addresses (Gmail, Outlook and so on) are never
matched by name alone, so staff verify those manually.

Set these in Supabase under **Edge Functions > Secrets**:

- `INSIGHTLY_API_KEY`: from Insightly, User Settings > API
- `INSIGHTLY_POD`: the part after `api.` in your Insightly API URL, e.g. `na1`
- `INSIGHTLY_MEMBER_FIELD`: where membership is recorded on an Organisation, e.g. `Membership_Status__c`, or `TAG:Member` if members are tagged
- `INSIGHTLY_MEMBER_VALUES`: values that mean current member, comma-separated (default `Active,Member,Current,Yes,true`)

**Lapsed memberships:** every night at 3:15 a.m. Eastern, the `sync-memberships` function re-checks
every member company (and every company linked to an Insightly record). If Insightly no longer shows
a current membership, free posting is removed straight away, the company is marked **Lapsed**, and the
employer sees a renewal notice. Renewals switch free posting back on automatically. Live postings stay
up until they expire. Staff can run the sync any time with **Sync now** on the Companies tab, and can link
a company to its Insightly record by ID so it's always checked against the right organisation.
Companies that can't be found in Insightly are left as they are and flagged for staff.

When AIA moves to HubSpot, only `_shared/insightly.ts` needs to change.

## Salary information (Statistics Canada)

The Salary Information section on /parents shows the latest average earnings for auto care industries
from Statistics Canada's Survey of Employment, Payrolls and Hours: average weekly earnings (table
14-10-0203-01) and average hourly earnings for hourly-paid employees (table 14-10-0205-01), for Canada
and each province and territory. The `statcan-wages` function pulls them from Statistics Canada's free
Web Data Service every day at 4:30 a.m. Eastern and saves a copy, so the page stays fast and keeps the
last good figures if Statistics Canada is unavailable. Industries shown: automotive repair and
maintenance (NAICS 8111), automotive parts, accessories and tire retailers (4413), new motor vehicle
parts and accessories merchant wholesalers (4153), motor vehicle parts manufacturing (3363), and all
industries for comparison.

## Editing site content

Admins can change the wording on the home page, the For employers page, the quiz start screen and
the footer, and swap the home page photo, at **Site content** in the top menu (or the
**Edit this page** button that admins see on those pages). Changes go live when saved.
Each field has **Restore original** to go back to the built-in wording.

## Setup

### 1. Supabase
1. Create a new project. Choose the **Canada (Central)** region so personal data stays in Canada.
2. Open **SQL Editor**, paste the contents of `supabase/migrations/0001_init.sql`, and run it.
3. Under **Authentication > URL Configuration**, set the Site URL to your live address
   (e.g. `https://careers.aiacanada.com`) and add it, plus `http://localhost:5173`, to Redirect URLs.
4. Sign up on the site with your own email, then make yourself an admin by running this in the SQL Editor:
   ```sql
   alter table public.profiles disable trigger profiles_protect_role;
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@aiacanada.com');
   alter table public.profiles enable trigger profiles_protect_role;
   ```
5. Copy the **Project URL** and **anon / publishable key** from **Project Settings > API**.

### 2. Cloudflare Pages
1. **Workers & Pages > Create > Pages > Connect to Git**, and choose this repository.
2. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_NONMEMBER_PAYMENT_URL` (the HubSpot payment link for a non-member posting)
   - `VITE_NONMEMBER_FEATURED_PAYMENT_URL` (the HubSpot payment link for a non-member posting plus featured placement)
4. Deploy. Every push to `main` deploys automatically.

### 3. Local development (optional)
```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

## Not built yet
- Automatic payment confirmation from HubSpot (for now, staff click **Mark paid**)
- Automatic member verification from HubSpot (for now, staff click **Mark as member**)
- Email notifications to employers and candidates
- Candidate profiles and a searchable resume bank
- Banner ad placements
- French
