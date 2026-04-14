-- Require password change on first app sign-in after admin creates Auth + profile link.

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

comment on column public.profiles.must_change_password is
  'When true, mobile app forces user to set a new password before main navigation.';
