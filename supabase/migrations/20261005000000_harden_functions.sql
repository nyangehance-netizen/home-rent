-- Keep security-rule helpers out of the public API.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.manages_listing(uuid)  set schema private;
alter function public.my_role()               set schema private;
alter function public.can_see_profile(uuid)   set schema private;
alter function public.has_listing_link(uuid)  set schema private;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated;

-- Trigger functions are never called directly.
revoke all on function public.handle_new_user()  from public, anon, authenticated;
revoke all on function public.on_payment_paid()  from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
alter function public.touch_updated_at() set search_path = '';

-- Commissions view runs with the caller's rights; brokers still see listings linked to their clients.
alter view public.broker_commissions set (security_invoker = on);
