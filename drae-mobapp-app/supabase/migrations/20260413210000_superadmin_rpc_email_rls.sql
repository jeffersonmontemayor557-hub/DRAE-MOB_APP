-- Fix add/remove admin RPCs:
-- 1) Match Auth users by primary email OR OAuth-provided email in raw_user_meta_data.
-- 2) Temporarily disable row_security for the write after is_superadmin() passes — Supabase still
--    evaluates RLS as the invoker for some SECURITY DEFINER table writes, which can block inserts.

create or replace function public.superadmin_add_admin_by_email(p_email text, p_role text default 'admin')
returns uuid
language plpgsql
security definer
set search_path to public
as $$
declare
  uid uuid;
  norm text;
begin
  if not public.is_superadmin() then
    raise exception 'Forbidden';
  end if;
  if p_role is null or p_role not in ('superadmin', 'admin') then
    raise exception 'Invalid role';
  end if;

  norm := lower(trim(both from p_email));

  select au.id into uid
  from auth.users au
  where lower(trim(both from coalesce(au.email::text, ''))) = norm
     or lower(trim(both from coalesce(au.raw_user_meta_data->>'email', ''))) = norm;

  if uid is null then
    raise exception
      using message = 'No Auth user with that email. In Supabase: Authentication → Users → Invite or Add user, then try again.';
  end if;

  perform set_config('row_security', 'off', true);
  insert into public.app_admins (user_id, role) values (uid, p_role)
  on conflict (user_id) do update set role = excluded.role;
  return uid;
end;
$$;

create or replace function public.superadmin_remove_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Forbidden';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove your own dashboard access.';
  end if;
  perform set_config('row_security', 'off', true);
  delete from public.app_admins where user_id = p_user_id;
end;
$$;
