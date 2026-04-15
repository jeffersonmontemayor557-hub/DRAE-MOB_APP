-- Superadmin vs admin: only superadmins manage public.app_admins.
-- Bootstrap (SQL Editor, once): insert your auth user as superadmin:
--   insert into public.app_admins (user_id, role) values ('<uuid>', 'superadmin')
--   on conflict (user_id) do update set role = excluded.role;
-- Existing rows from older migrations get role = 'admin'; promote one account with UPDATE.

alter table public.app_admins
  add column if not exists role text not null default 'admin';

alter table public.app_admins
  drop constraint if exists app_admins_role_check;

alter table public.app_admins
  add constraint app_admins_role_check check (role in ('superadmin', 'admin'));

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1 from public.app_admins a
    where a.user_id = auth.uid() and a.role = 'superadmin'
  );
$$;

revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to authenticated;

-- is_app_admin(): any dashboard operator (superadmin or admin)
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1 from public.app_admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

drop policy if exists "app_admins_select" on public.app_admins;
drop policy if exists "app_admins_admin_insert" on public.app_admins;
drop policy if exists "app_admins_admin_delete" on public.app_admins;
drop policy if exists "app_admins_super_insert" on public.app_admins;
drop policy if exists "app_admins_super_update" on public.app_admins;
drop policy if exists "app_admins_super_delete" on public.app_admins;

create policy "app_admins_select" on public.app_admins
for select to authenticated using (
  user_id = auth.uid()
  or public.is_superadmin()
);

create policy "app_admins_super_insert" on public.app_admins
for insert to authenticated with check (public.is_superadmin());

create policy "app_admins_super_update" on public.app_admins
for update to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

create policy "app_admins_super_delete" on public.app_admins
for delete to authenticated using (public.is_superadmin());

create or replace function public.app_admins_guard_last_superadmin()
returns trigger
language plpgsql
set search_path to public
as $$
declare
  others int;
begin
  if tg_op = 'DELETE' then
    if old.role = 'superadmin' then
      select count(*) into others
      from public.app_admins
      where role = 'superadmin' and user_id <> old.user_id;
      if others < 1 then
        raise exception 'Cannot remove the last superadmin.';
      end if;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.role = 'superadmin' and new.role = 'admin' then
      select count(*) into others
      from public.app_admins
      where role = 'superadmin' and user_id <> old.user_id;
      if others < 1 then
        raise exception 'Cannot demote the last superadmin.';
      end if;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_app_admins_guard_super on public.app_admins;
create trigger trg_app_admins_guard_super
before update or delete on public.app_admins
for each row
execute procedure public.app_admins_guard_last_superadmin();

create or replace function public.superadmin_list_app_admins()
returns table (user_id uuid, email text, role text, created_at timestamptz)
language sql
stable
security definer
set search_path to public
as $$
  select a.user_id, u.email::text, a.role, a.created_at
  from public.app_admins a
  join auth.users u on u.id = a.user_id
  where public.is_superadmin();
$$;

revoke all on function public.superadmin_list_app_admins() from public;
grant execute on function public.superadmin_list_app_admins() to authenticated;

create or replace function public.superadmin_add_admin_by_email(p_email text, p_role text default 'admin')
returns uuid
language plpgsql
security definer
set search_path to public
as $$
declare
  uid uuid;
begin
  if not public.is_superadmin() then
    raise exception 'Forbidden';
  end if;
  if p_role is null or p_role not in ('superadmin', 'admin') then
    raise exception 'Invalid role';
  end if;
  select au.id into uid
  from auth.users au
  where lower(trim(both from au.email::text)) = lower(trim(both from p_email));
  if uid is null then
    raise exception 'No Auth user with that email. Create the user under Authentication → Users, or have them sign in once.';
  end if;
  insert into public.app_admins (user_id, role) values (uid, p_role)
  on conflict (user_id) do update set role = excluded.role;
  return uid;
end;
$$;

revoke all on function public.superadmin_add_admin_by_email(text, text) from public;
grant execute on function public.superadmin_add_admin_by_email(text, text) to authenticated;

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
  delete from public.app_admins where user_id = p_user_id;
end;
$$;

revoke all on function public.superadmin_remove_admin(uuid) from public;
grant execute on function public.superadmin_remove_admin(uuid) to authenticated;
