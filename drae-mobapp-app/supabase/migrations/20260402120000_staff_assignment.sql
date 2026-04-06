-- Incremental migration: response team + automatic assignment (run if schema.sql was applied before this feature).
-- Safe to run once on an existing database.

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text,
  phone text,
  hazard_types text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.incident_reports
  add column if not exists assigned_staff_id uuid references public.staff_members(id) on delete set null;

drop trigger if exists trg_auto_assign_incident on public.incident_reports;
drop function if exists public.auto_assign_incident_report();

create or replace function public.auto_assign_incident_report()
returns trigger
language plpgsql
as $$
declare
  pick uuid;
  hazard text;
begin
  if new.assigned_staff_id is not null then
    return new;
  end if;

  hazard := coalesce(new.hazard_type, '');

  select sm.id into pick
  from public.staff_members sm
  where sm.active = true
    and (
      cardinality(sm.hazard_types) = 0
      or hazard = any (sm.hazard_types)
    )
  order by (
    select count(*)::bigint
    from public.incident_reports ir
    where ir.assigned_staff_id = sm.id
      and ir.status in ('submitted', 'in_progress')
  ) asc,
  sm.full_name asc
  limit 1;

  if pick is null then
    select sm.id into pick
    from public.staff_members sm
    where sm.active = true
    order by (
      select count(*)::bigint
      from public.incident_reports ir
      where ir.assigned_staff_id = sm.id
        and ir.status in ('submitted', 'in_progress')
    ) asc,
    sm.full_name asc
    limit 1;
  end if;

  if pick is not null then
    new.assigned_staff_id := pick;
  end if;

  return new;
end;
$$;

create trigger trg_auto_assign_incident
before insert on public.incident_reports
for each row
execute procedure public.auto_assign_incident_report();

alter table public.staff_members enable row level security;

drop policy if exists "staff_members_open_access" on public.staff_members;
create policy "staff_members_open_access" on public.staff_members
for all
to anon
using (true)
with check (true);

insert into public.staff_members (
  id,
  full_name,
  role,
  phone,
  hazard_types,
  active
)
values
  (
    'f1111111-1111-1111-1111-111111111111',
    'Maria L. Santos',
    'CDRRMO Field Responder',
    '09170001111',
    array['Flood', 'Landslide']::text[],
    true
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    'Jose R. Ramos',
    'Fire & Rescue Liaison',
    '09170002222',
    array['Fire', 'Earthquake']::text[],
    true
  ),
  (
    'f3333333-3333-3333-3333-333333333333',
    'Ana K. Cruz',
    'Operations Coordinator',
    '09170003333',
    array['Others', 'Tropical Cyclone']::text[],
    true
  ),
  (
    'f4444444-4444-4444-4444-444444444444',
    'Leo P. Mendoza',
    'General Response Pool',
    '09170004444',
    '{}'::text[],
    true
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  phone = excluded.phone,
  hazard_types = excluded.hazard_types,
  active = excluded.active;
