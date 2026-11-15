-- Close the travel tables. Before: anyone holding the public anon key could read, change and delete every trip.
-- After: a trip (and its events, notes, checklist, expenses) is reachable only
--   * by a signed-in owner (travel_owners), or
--   * by a request that presents the trip's token in the x-trip-tokens header:
--     view token = read only, edit token = read and write.
-- Creating a trip requires an owner.

create table if not exists public.travel_owners (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.travel_owners enable row level security; -- no policies: not readable through the API
revoke all on public.travel_owners from anon, authenticated;
insert into public.travel_owners (user_id) select id from auth.users on conflict do nothing;

create or replace function public.travel_is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.travel_owners o where o.user_id = (select auth.uid()));
$$;

create or replace function public.travel_tokens() returns text[]
language sql stable set search_path = '' as $$
  select coalesce(
    string_to_array(nullif(current_setting('request.headers', true), '')::json ->> 'x-trip-tokens', ','),
    '{}'::text[]);
$$;

create or replace function public.travel_can(trip uuid, need_edit boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.travel_is_owner() or exists (
    select 1 from public.travel_trips t
    where t.id = trip
      and (t.edit_token::text = any (public.travel_tokens())
           or (not need_edit and t.view_token::text = any (public.travel_tokens()))));
$$;

drop policy if exists travel_trips_anon_all on public.travel_trips;
drop policy if exists travel_events_anon_all on public.travel_events;
drop policy if exists travel_notes_anon_all on public.travel_notes;
drop policy if exists travel_checklist_anon_all on public.travel_checklist;
drop policy if exists travel_expenses_anon_all on public.travel_expenses;

create policy travel_trips_read on public.travel_trips for select to anon, authenticated
  using (public.travel_is_owner() or edit_token::text = any (public.travel_tokens()) or view_token::text = any (public.travel_tokens()));
create policy travel_trips_create on public.travel_trips for insert to authenticated
  with check (public.travel_is_owner());
create policy travel_trips_change on public.travel_trips for update to anon, authenticated
  using (public.travel_is_owner() or edit_token::text = any (public.travel_tokens()))
  with check (public.travel_is_owner() or edit_token::text = any (public.travel_tokens()));
create policy travel_trips_remove on public.travel_trips for delete to anon, authenticated
  using (public.travel_is_owner() or edit_token::text = any (public.travel_tokens()));

do $$
declare t text;
begin
  foreach t in array array['travel_events', 'travel_notes', 'travel_checklist', 'travel_expenses'] loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (public.travel_can(trip_id, false))', t || '_read', t);
    execute format('create policy %I on public.%I for insert to anon, authenticated with check (public.travel_can(trip_id, true))', t || '_create', t);
    execute format('create policy %I on public.%I for update to anon, authenticated using (public.travel_can(trip_id, true)) with check (public.travel_can(trip_id, true))', t || '_change', t);
    execute format('create policy %I on public.%I for delete to anon, authenticated using (public.travel_can(trip_id, true))', t || '_remove', t);
  end loop;
end $$;
