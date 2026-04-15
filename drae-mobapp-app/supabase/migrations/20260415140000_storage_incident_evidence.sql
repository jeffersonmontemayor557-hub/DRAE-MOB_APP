-- Bucket + RLS for mobile photo/audio uploads (anon + authenticated inserts; public reads for URLs).

insert into storage.buckets (id, name, public)
values ('incident-evidence', 'incident-evidence', true)
on conflict (id) do update set public = true;

drop policy if exists "incident_evidence_select" on storage.objects;
drop policy if exists "incident_evidence_insert_authenticated" on storage.objects;
drop policy if exists "incident_evidence_insert_anon" on storage.objects;

-- List/read objects in bucket (dashboard + signed/public URLs)
create policy "incident_evidence_select"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'incident-evidence');

create policy "incident_evidence_insert_authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'incident-evidence');

create policy "incident_evidence_insert_anon"
on storage.objects for insert
to anon
with check (bucket_id = 'incident-evidence');
