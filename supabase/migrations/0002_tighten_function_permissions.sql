-- Trigger functions: never callable through the API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke execute on function public.protect_company_membership() from public, anon, authenticated;
revoke execute on function public.link_company_creator() from public, anon, authenticated;
revoke execute on function public.protect_job_workflow() from public, anon, authenticated;

-- Workflow actions: signed-in users only (each function checks permissions itself)
revoke execute on function public.submit_job(uuid) from public, anon;
revoke execute on function public.admin_mark_paid(uuid) from public, anon;
revoke execute on function public.admin_publish_job(uuid, int) from public, anon;
revoke execute on function public.admin_reject_job(uuid, text) from public, anon;
grant execute on function public.submit_job(uuid) to authenticated;
grant execute on function public.admin_mark_paid(uuid) to authenticated;
grant execute on function public.admin_publish_job(uuid, int) to authenticated;
grant execute on function public.admin_reject_job(uuid, text) to authenticated;

-- is_admin() and is_company_user() stay callable: the security rules use them,
-- and they only answer questions about the person asking.
