-- Dispatch queue: one open report per staff, auto-queue when none available, redispatch on resolve.
-- Staff mobile actions: start (in_progress) and resolve (resolved) via security-definer RPC.

-- 1) Auto-assign on INSERT: pick only staff with zero open reports; else leave unassigned.
create or replace function public.auto_assign_incident_report()
returns trigger
language plpgsql
set search_path to public
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
    and (cardinality(sm.hazard_types) = 0 or hazard = any (sm.hazard_types))
    and not exists (
      select 1 from public.incident_reports ir
      where ir.assigned_staff_id = sm.id
        and ir.status in ('submitted', 'in_progress')
    )
  order by sm.full_name asc
  limit 1;

  if pick is null then
    select sm.id into pick
    from public.staff_members sm
    where sm.active = true
      and not exists (
        select 1 from public.incident_reports ir
        where ir.assigned_staff_id = sm.id
          and ir.status in ('submitted', 'in_progress')
      )
    order by sm.full_name asc
    limit 1;
  end if;

  if pick is not null then
    new.assigned_staff_id := pick;
  end if;

  return new;
end;
$$;

-- 2) Enforce: a staff can hold at most one open (submitted/in_progress) report.
create or replace function public.enforce_staff_one_open()
returns trigger
language plpgsql
set search_path to public
as $$
begin
  if new.assigned_staff_id is null then
    return new;
  end if;
  if new.status not in ('submitted', 'in_progress') then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.assigned_staff_id is not distinct from old.assigned_staff_id
     and coalesce(new.status, '') = coalesce(old.status, '') then
    return new;
  end if;

  if exists (
    select 1 from public.incident_reports ir
    where ir.assigned_staff_id = new.assigned_staff_id
      and ir.status in ('submitted', 'in_progress')
      and ir.id <> new.id
  ) then
    raise exception 'Staff already has an open assignment. Resolve or unassign first.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_staff_one_open on public.incident_reports;
create trigger trg_enforce_staff_one_open
before insert or update on public.incident_reports
for each row
execute procedure public.enforce_staff_one_open();

-- 3) After resolve (or unassign): dispatch the oldest queued report to the freed staff.
create or replace function public.dispatch_next_queued_report()
returns trigger
language plpgsql
set search_path to public
as $$
declare
  freed_staff uuid;
  next_report uuid;
begin
  freed_staff := null;

  if tg_op = 'UPDATE'
     and new.assigned_staff_id is not null
     and coalesce(old.status, '') <> 'resolved'
     and new.status = 'resolved' then
    freed_staff := new.assigned_staff_id;
  end if;

  if tg_op = 'UPDATE'
     and old.assigned_staff_id is not null
     and new.assigned_staff_id is null
     and coalesce(new.status, '') <> 'resolved' then
    freed_staff := old.assigned_staff_id;
  end if;

  if freed_staff is null then
    return new;
  end if;

  if exists (
    select 1 from public.incident_reports ir
    where ir.assigned_staff_id = freed_staff
      and ir.status in ('submitted', 'in_progress')
  ) then
    return new;
  end if;

  select ir.id into next_report
  from public.incident_reports ir
  join public.staff_members sm on sm.id = freed_staff
  where ir.assigned_staff_id is null
    and ir.status = 'submitted'
    and (cardinality(sm.hazard_types) = 0 or coalesce(ir.hazard_type, '') = any (sm.hazard_types))
  order by ir.created_at asc
  limit 1;

  if next_report is null then
    select ir.id into next_report
    from public.incident_reports ir
    where ir.assigned_staff_id is null
      and ir.status = 'submitted'
    order by ir.created_at asc
    limit 1;
  end if;

  if next_report is not null then
    update public.incident_reports
    set assigned_staff_id = freed_staff
    where id = next_report
      and assigned_staff_id is null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dispatch_next_queued_report on public.incident_reports;
create trigger trg_dispatch_next_queued_report
after update on public.incident_reports
for each row
execute procedure public.dispatch_next_queued_report();

-- 4) Staff mobile actions: start + resolve, scoped to caller's staff row.
create or replace function public.staff_start_assignment(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
declare
  v_staff_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select sm.id into v_staff_id
  from public.staff_members sm
  join public.profiles p on p.id = sm.profile_id
  where p.user_id = auth.uid()
    and sm.active = true;

  if v_staff_id is null then
    raise exception 'You are not linked to an active staff record';
  end if;

  update public.incident_reports
  set status = 'in_progress'
  where id = p_report_id
    and assigned_staff_id = v_staff_id
    and status = 'submitted';

  if not found then
    raise exception 'Cannot start: report not assigned to you or already started';
  end if;
end;
$$;

revoke all on function public.staff_start_assignment(uuid) from public;
grant execute on function public.staff_start_assignment(uuid) to authenticated;

create or replace function public.staff_resolve_assignment(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
declare
  v_staff_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select sm.id into v_staff_id
  from public.staff_members sm
  join public.profiles p on p.id = sm.profile_id
  where p.user_id = auth.uid()
    and sm.active = true;

  if v_staff_id is null then
    raise exception 'You are not linked to an active staff record';
  end if;

  update public.incident_reports
  set status = 'resolved'
  where id = p_report_id
    and assigned_staff_id = v_staff_id
    and status in ('submitted', 'in_progress');

  if not found then
    raise exception 'Cannot resolve: report not assigned to you or already resolved';
  end if;
end;
$$;

revoke all on function public.staff_resolve_assignment(uuid) from public;
grant execute on function public.staff_resolve_assignment(uuid) to authenticated;

comment on function public.auto_assign_incident_report() is
  'Assigns a free active staff (hazard-first); leaves unassigned when none free (queued).';
comment on function public.enforce_staff_one_open() is
  'Prevents two open reports per staff. Admin must resolve/unassign first.';
comment on function public.dispatch_next_queued_report() is
  'When a staff becomes free (resolve/unassign), picks the oldest queued report.';
comment on function public.staff_start_assignment(uuid) is
  'Staff marks their own assignment in_progress.';
comment on function public.staff_resolve_assignment(uuid) is
  'Staff marks their own assignment resolved; fires queue dispatch.';
