-- Flag: user must complete Personal Information in the mobile app (admin-created stub profiles).
alter table public.profiles
  add column if not exists must_complete_profile boolean not null default false;

comment on column public.profiles.must_complete_profile is
  'When true, app routes to Personal Information until the user saves a complete profile.';
