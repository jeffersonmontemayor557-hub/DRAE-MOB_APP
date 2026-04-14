-- Optional GPS captured from the mobile app at submit time (for dispatch proximity).
alter table public.incident_reports
  add column if not exists latitude double precision;

alter table public.incident_reports
  add column if not exists longitude double precision;
