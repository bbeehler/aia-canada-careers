-- New role: AIA staff (review postings, manage companies). 'admin' is now the super admin.
alter type public.user_role add value if not exists 'staff' before 'admin';
