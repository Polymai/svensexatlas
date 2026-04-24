grant usage on schema app643_svensexaatlas to anon, authenticated;

grant select, insert, update, delete on all tables in schema app643_svensexaatlas to authenticated;

revoke all on all tables in schema app643_svensexaatlas from anon;

alter table app643_svensexaatlas.weekends enable row level security;
alter table app643_svensexaatlas.places enable row level security;
alter table app643_svensexaatlas.activities enable row level security;
alter table app643_svensexaatlas.participants enable row level security;
alter table app643_svensexaatlas.live_locations enable row level security;

drop policy if exists weekends_owner_select on app643_svensexaatlas.weekends;
create policy weekends_owner_select
on app643_svensexaatlas.weekends
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists weekends_owner_insert on app643_svensexaatlas.weekends;
create policy weekends_owner_insert
on app643_svensexaatlas.weekends
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists weekends_owner_update on app643_svensexaatlas.weekends;
create policy weekends_owner_update
on app643_svensexaatlas.weekends
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists weekends_owner_delete on app643_svensexaatlas.weekends;
create policy weekends_owner_delete
on app643_svensexaatlas.weekends
for delete
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists places_owner_select on app643_svensexaatlas.places;
create policy places_owner_select
on app643_svensexaatlas.places
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists places_owner_insert on app643_svensexaatlas.places;
create policy places_owner_insert
on app643_svensexaatlas.places
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from app643_svensexaatlas.weekends w
    where w.id = weekend_id
      and w.owner_user_id = auth.uid()
  )
);

drop policy if exists places_owner_update on app643_svensexaatlas.places;
create policy places_owner_update
on app643_svensexaatlas.places
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists places_owner_delete on app643_svensexaatlas.places;
create policy places_owner_delete
on app643_svensexaatlas.places
for delete
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists activities_owner_select on app643_svensexaatlas.activities;
create policy activities_owner_select
on app643_svensexaatlas.activities
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists activities_owner_insert on app643_svensexaatlas.activities;
create policy activities_owner_insert
on app643_svensexaatlas.activities
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from app643_svensexaatlas.weekends w
    where w.id = weekend_id
      and w.owner_user_id = auth.uid()
  )
);

drop policy if exists activities_owner_update on app643_svensexaatlas.activities;
create policy activities_owner_update
on app643_svensexaatlas.activities
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists activities_owner_delete on app643_svensexaatlas.activities;
create policy activities_owner_delete
on app643_svensexaatlas.activities
for delete
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists participants_owner_select on app643_svensexaatlas.participants;
create policy participants_owner_select
on app643_svensexaatlas.participants
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists participants_owner_insert on app643_svensexaatlas.participants;
create policy participants_owner_insert
on app643_svensexaatlas.participants
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1
    from app643_svensexaatlas.weekends w
    where w.id = weekend_id
      and w.owner_user_id = auth.uid()
  )
);

drop policy if exists participants_owner_update on app643_svensexaatlas.participants;
create policy participants_owner_update
on app643_svensexaatlas.participants
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists participants_owner_delete on app643_svensexaatlas.participants;
create policy participants_owner_delete
on app643_svensexaatlas.participants
for delete
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists live_locations_owner_select on app643_svensexaatlas.live_locations;
create policy live_locations_owner_select
on app643_svensexaatlas.live_locations
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists live_locations_owner_insert on app643_svensexaatlas.live_locations;
create policy live_locations_owner_insert
on app643_svensexaatlas.live_locations
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists live_locations_owner_update on app643_svensexaatlas.live_locations;
create policy live_locations_owner_update
on app643_svensexaatlas.live_locations
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists live_locations_owner_delete on app643_svensexaatlas.live_locations;
create policy live_locations_owner_delete
on app643_svensexaatlas.live_locations
for delete
to authenticated
using (owner_user_id = auth.uid());

revoke all on function app643_svensexaatlas.get_public_weekend(text) from public;
revoke all on function app643_svensexaatlas.claim_participant(text, text) from public;
revoke all on function app643_svensexaatlas.touch_location(text, double precision, double precision, numeric, numeric, numeric) from public;
revoke all on function app643_svensexaatlas.stop_sharing(text) from public;

grant execute on function app643_svensexaatlas.get_public_weekend(text) to anon, authenticated;
grant execute on function app643_svensexaatlas.claim_participant(text, text) to anon, authenticated;
grant execute on function app643_svensexaatlas.touch_location(text, double precision, double precision, numeric, numeric, numeric) to anon, authenticated;
grant execute on function app643_svensexaatlas.stop_sharing(text) to anon, authenticated;