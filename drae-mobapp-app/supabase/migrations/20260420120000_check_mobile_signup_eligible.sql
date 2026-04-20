-- Only allow mobile self-sign-up when a resident profile row already exists for this email
-- with no linked Auth user (created by admin / office records). Prevents random public sign-ups.
create or replace function public.check_mobile_signup_eligible(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(p_email, '')))
      and p.user_id is null
  );
$$;

comment on function public.check_mobile_signup_eligible(text) is
  'Returns true if profiles has this email and no user_id yet (eligible for mobile sign-up link).';

revoke all on function public.check_mobile_signup_eligible(text) from public;
grant execute on function public.check_mobile_signup_eligible(text) to anon, authenticated;
