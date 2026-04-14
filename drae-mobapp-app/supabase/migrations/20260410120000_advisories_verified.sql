-- Trusted-source flags for advisories (mobile “verified” badge).

alter table public.advisories
  add column if not exists is_verified boolean not null default true;

comment on column public.advisories.is_verified is 'When true, show verified badge in the mobile app.';
