# AIA Canada Careers

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

Each posting collects a pay range, whether it's a current vacancy, and whether AI is used in
screening, so postings meet Ontario's job posting rules.

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
