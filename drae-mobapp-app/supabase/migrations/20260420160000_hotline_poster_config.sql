-- Full emergency hotline poster (Guides screen + PNG). Edited from admin dashboard.
-- Mobile falls back to app defaults if this row is missing.

create table if not exists public.hotline_poster_config (
  id smallint primary key default 1,
  constraint hotline_poster_config_singleton check (id = 1),
  config jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.hotline_poster_config enable row level security;

drop policy if exists "hotline_poster_config_anon_select" on public.hotline_poster_config;
drop policy if exists "hotline_poster_config_auth_select" on public.hotline_poster_config;
drop policy if exists "hotline_poster_config_admin_insert" on public.hotline_poster_config;
drop policy if exists "hotline_poster_config_admin_update" on public.hotline_poster_config;
drop policy if exists "hotline_poster_config_admin_delete" on public.hotline_poster_config;

create policy "hotline_poster_config_anon_select" on public.hotline_poster_config
for select to anon using (true);

create policy "hotline_poster_config_auth_select" on public.hotline_poster_config
for select to authenticated using (true);

create policy "hotline_poster_config_admin_insert" on public.hotline_poster_config
for insert to authenticated with check (public.is_app_admin());

create policy "hotline_poster_config_admin_update" on public.hotline_poster_config
for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create policy "hotline_poster_config_admin_delete" on public.hotline_poster_config
for delete to authenticated using (public.is_app_admin());

grant select on table public.hotline_poster_config to anon, authenticated;
grant insert, update, delete on table public.hotline_poster_config to authenticated;

-- Allow duplicate labels (e.g. multiple rows per agency) on legacy quick-dial list.
alter table public.hotlines drop constraint if exists hotlines_label_unique;

insert into public.hotline_poster_config (id, config)
values (
  1,
  '{"headerSubtitle":"CITY DISASTER RISK REDUCTION AND MANAGEMENT OFFICE","headerLocation":"CITY OF DASMARIÑAS, CAVITE","mainTitle":"EMERGENCY HOTLINES","tagalogReminder":"Maging mapagmatyag at makipagtulungan, ipagbigay-alam ang mga kaganapan sa inyong mga nasasakupan. Makipag-ugnayan sa mga sumusunod na numero:","leftColumn":[{"title":"EMERGENCY OPERATION CENTER 24 / 7 HOTLINE","lines":["(046) 435-0183","(046) 481-0555","0908-818-5555"]},{"title":"AMBULANCE CENTER / CITY RESCUE GROUP","lines":["0998-566-5555","0917-777-5263"]},{"title":"BUREAU OF FIRE PROTECTION","lines":["(046) 416-0875","(046) 884-6131","0998-336-9534","0992-448-7857","FB: BFP DASMA FS CAVITE"]}],"rightColumn":[{"title":"CITY DISASTER RISK REDUCTION AND MANAGEMENT OFFICE","lines":["(046) 513-1766","0917-721-8825","0998-843-5477"]},{"title":"MERALCO","lines":["0917-551-6211","0920-971-6211"]},{"title":"PHILIPPINE NATIONAL POLICE","lines":["(046) 416-0256","0998-598-5508","0956-803-3329"]}],"footer":[{"label":"Email","value":"dasmacity.drrmo@yahoo.com"},{"label":"Mobile","value":"0917-721-8825"},{"label":"Facebook","value":"Dasmariñas DRRMO"}]}'::jsonb
)
on conflict (id) do nothing;

comment on table public.hotline_poster_config is 'Singleton JSON poster for Guides Emergency Hotlines + admin editor.';
