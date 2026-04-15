-- Dashboard operators: force password change after superadmin provisions a temp password.

alter table public.app_admins
  add column if not exists must_change_password boolean not null default false;

comment on column public.app_admins.must_change_password is
  'When true, the admin web blocks the dashboard until the user sets a new password via Auth.';

create or replace function public.app_admin_clear_must_change_password()
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public.app_admins
  set must_change_password = false
  where user_id = auth.uid();
end;
$$;

revoke all on function public.app_admin_clear_must_change_password() from public;
grant execute on function public.app_admin_clear_must_change_password() to authenticated;
