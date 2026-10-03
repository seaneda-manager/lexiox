-- Create a view for listing listening sets visible to the current user
create or replace view public.v_user_listening_sets
with (security_invoker = on) as
select
  null::uuid as id,
  null::text as title
where false;
