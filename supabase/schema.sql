create extension if not exists pgcrypto;

create schema if not exists app643_svensexaatlas;

create or replace function app643_svensexaatlas.random_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer := 0;
begin
  while i < 6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    i := i + 1;
  end loop;
  return result;
end;
$$;

create or replace function app643_svensexaatlas.pick_color()
returns text
language plpgsql
as $$
declare
  palette text[] := array[
    '#1c6b63',
    '#8a5a22',
    '#7c3a6b',
    '#2f5b9a',
    '#b44937',
    '#688f2b'
  ];
begin
  return palette[1 + floor(random() * array_length(palette, 1))::integer];
end;
$$;

create table if not exists app643_svensexaatlas.weekends (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  subtitle text,
  city text,
  intro text,
  sharing_message text,
  public_code text not null unique default app643_svensexaatlas.random_code(),
  start_at timestamptz,
  end_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekends_public_code_upper check (public_code = upper(public_code)),
  constraint weekends_title_not_blank check (length(trim(title)) > 0)
);

create table if not exists app643_svensexaatlas.places (
  id uuid primary key default gen_random_uuid(),
  weekend_id uuid not null references app643_svensexaatlas.weekends(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  address text,
  notes text,
  lat double precision,
  lng double precision,
  sort_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists app643_svensexaatlas.activities (
  id uuid primary key default gen_random_uuid(),
  weekend_id uuid not null references app643_svensexaatlas.weekends(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  place_id uuid references app643_svensexaatlas.places(id) on delete set null,
  title text not null,
  notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_title_not_blank check (length(trim(title)) > 0)
);

create table if not exists app643_svensexaatlas.participants (
  id uuid primary key default gen_random_uuid(),
  weekend_id uuid not null references app643_svensexaatlas.weekends(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null,
  color text not null default app643_svensexaatlas.pick_color(),
  is_guest boolean not null default false,
  join_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  sharing_enabled boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint participants_name_not_blank check (length(trim(display_name)) > 0)
);

create unique index if not exists participants_weekend_name_lower_key
  on app643_svensexaatlas.participants (weekend_id, lower(display_name));

alter table app643_svensexaatlas.weekends
  alter column owner_user_id set default auth.uid();

alter table app643_svensexaatlas.participants
  alter column owner_user_id set default auth.uid();

create table if not exists app643_svensexaatlas.live_locations (
  id uuid primary key default gen_random_uuid(),
  weekend_id uuid not null references app643_svensexaatlas.weekends(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  participant_id uuid not null unique references app643_svensexaatlas.participants(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_m numeric,
  heading numeric,
  speed_mps numeric,
  is_active boolean not null default true,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weekends_owner_idx
  on app643_svensexaatlas.weekends (owner_user_id, created_at desc);

create index if not exists weekends_public_code_idx
  on app643_svensexaatlas.weekends (public_code);

create index if not exists places_weekend_idx
  on app643_svensexaatlas.places (weekend_id, sort_index);

create index if not exists activities_weekend_idx
  on app643_svensexaatlas.activities (weekend_id, starts_at);

create index if not exists participants_weekend_idx
  on app643_svensexaatlas.participants (weekend_id, display_name);

create index if not exists participants_join_token_idx
  on app643_svensexaatlas.participants (join_token);

create index if not exists live_locations_weekend_idx
  on app643_svensexaatlas.live_locations (weekend_id, recorded_at desc);

create or replace function app643_svensexaatlas.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists weekends_touch_updated_at on app643_svensexaatlas.weekends;
create trigger weekends_touch_updated_at
before update on app643_svensexaatlas.weekends
for each row
execute function app643_svensexaatlas.touch_updated_at();

drop trigger if exists places_touch_updated_at on app643_svensexaatlas.places;
create trigger places_touch_updated_at
before update on app643_svensexaatlas.places
for each row
execute function app643_svensexaatlas.touch_updated_at();

drop trigger if exists activities_touch_updated_at on app643_svensexaatlas.activities;
create trigger activities_touch_updated_at
before update on app643_svensexaatlas.activities
for each row
execute function app643_svensexaatlas.touch_updated_at();

drop trigger if exists participants_touch_updated_at on app643_svensexaatlas.participants;
create trigger participants_touch_updated_at
before update on app643_svensexaatlas.participants
for each row
execute function app643_svensexaatlas.touch_updated_at();

drop trigger if exists live_locations_touch_updated_at on app643_svensexaatlas.live_locations;
create trigger live_locations_touch_updated_at
before update on app643_svensexaatlas.live_locations
for each row
execute function app643_svensexaatlas.touch_updated_at();

create or replace function app643_svensexaatlas.get_public_weekend(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = app643_svensexaatlas, public
as $$
declare
  v_weekend app643_svensexaatlas.weekends%rowtype;
begin
  select *
  into v_weekend
  from app643_svensexaatlas.weekends
  where public_code = upper(trim(p_code))
    and is_published = true
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'weekend',
    jsonb_build_object(
      'id', v_weekend.id,
      'title', v_weekend.title,
      'subtitle', v_weekend.subtitle,
      'city', v_weekend.city,
      'intro', v_weekend.intro,
      'sharing_message', v_weekend.sharing_message,
      'public_code', v_weekend.public_code,
      'start_at', v_weekend.start_at,
      'end_at', v_weekend.end_at,
      'is_published', v_weekend.is_published
    ),
    'places',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'address', p.address,
          'notes', p.notes,
          'lat', p.lat,
          'lng', p.lng,
          'sort_index', p.sort_index
        )
        order by p.sort_index, p.name
      )
      from app643_svensexaatlas.places p
      where p.weekend_id = v_weekend.id
    ), '[]'::jsonb),
    'activities',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'title', a.title,
          'notes', a.notes,
          'starts_at', a.starts_at,
          'ends_at', a.ends_at,
          'order_index', a.order_index,
          'place_id', a.place_id,
          'place_name', p.name
        )
        order by a.starts_at nulls last, a.order_index, a.created_at
      )
      from app643_svensexaatlas.activities a
      left join app643_svensexaatlas.places p on p.id = a.place_id
      where a.weekend_id = v_weekend.id
    ), '[]'::jsonb),
    'participants',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pt.id,
          'display_name', pt.display_name,
          'color', pt.color,
          'is_guest', pt.is_guest,
          'sharing_enabled', pt.sharing_enabled,
          'last_seen_at', pt.last_seen_at,
          'location',
          case
            when ll.participant_id is not null
              and ll.is_active = true
              and ll.recorded_at > now() - interval '90 minutes'
              and pt.sharing_enabled = true
            then jsonb_build_object(
              'lat', ll.lat,
              'lng', ll.lng,
              'accuracy_m', ll.accuracy_m,
              'recorded_at', ll.recorded_at
            )
            else null
          end
        )
        order by pt.display_name
      )
      from app643_svensexaatlas.participants pt
      left join app643_svensexaatlas.live_locations ll on ll.participant_id = pt.id
      where pt.weekend_id = v_weekend.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function app643_svensexaatlas.claim_participant(p_code text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = app643_svensexaatlas, public
as $$
declare
  v_weekend app643_svensexaatlas.weekends%rowtype;
  v_participant app643_svensexaatlas.participants%rowtype;
  v_name text := trim(p_name);
begin
  if v_name is null or length(v_name) = 0 then
    raise exception 'Name is required';
  end if;

  select *
  into v_weekend
  from app643_svensexaatlas.weekends
  where public_code = upper(trim(p_code))
    and is_published = true
  limit 1;

  if not found then
    raise exception 'Weekend not found';
  end if;

  select *
  into v_participant
  from app643_svensexaatlas.participants
  where weekend_id = v_weekend.id
    and lower(display_name) = lower(v_name)
  limit 1;

  if not found then
    insert into app643_svensexaatlas.participants (
      weekend_id,
      owner_user_id,
      display_name,
      color,
      is_guest,
      join_token,
      sharing_enabled,
      last_seen_at
    )
    values (
      v_weekend.id,
      v_weekend.owner_user_id,
      v_name,
      app643_svensexaatlas.pick_color(),
      true,
      encode(gen_random_bytes(16), 'hex'),
      true,
      now()
    )
    returning * into v_participant;
  else
    update app643_svensexaatlas.participants
    set
      sharing_enabled = true,
      last_seen_at = now()
    where id = v_participant.id
    returning * into v_participant;
  end if;

  return jsonb_build_object(
    'participant_id', v_participant.id,
    'display_name', v_participant.display_name,
    'color', v_participant.color,
    'join_token', v_participant.join_token,
    'sharing_enabled', v_participant.sharing_enabled
  );
end;
$$;

create or replace function app643_svensexaatlas.touch_location(
  p_join_token text,
  p_lat double precision,
  p_lng double precision,
  p_accuracy_m numeric,
  p_heading numeric,
  p_speed_mps numeric
)
returns jsonb
language plpgsql
security definer
set search_path = app643_svensexaatlas, public
as $$
declare
  v_participant app643_svensexaatlas.participants%rowtype;
  v_recorded_at timestamptz := now();
begin
  select *
  into v_participant
  from app643_svensexaatlas.participants
  where join_token = trim(p_join_token)
  limit 1;

  if not found then
    raise exception 'Participant not found';
  end if;

  update app643_svensexaatlas.participants
  set
    sharing_enabled = true,
    last_seen_at = v_recorded_at
  where id = v_participant.id;

  insert into app643_svensexaatlas.live_locations (
    weekend_id,
    owner_user_id,
    participant_id,
    lat,
    lng,
    accuracy_m,
    heading,
    speed_mps,
    is_active,
    recorded_at
  )
  values (
    v_participant.weekend_id,
    v_participant.owner_user_id,
    v_participant.id,
    p_lat,
    p_lng,
    p_accuracy_m,
    p_heading,
    p_speed_mps,
    true,
    v_recorded_at
  )
  on conflict (participant_id) do update
  set
    lat = excluded.lat,
    lng = excluded.lng,
    accuracy_m = excluded.accuracy_m,
    heading = excluded.heading,
    speed_mps = excluded.speed_mps,
    is_active = true,
    recorded_at = excluded.recorded_at,
    updated_at = now();

  return jsonb_build_object(
    'participant_id', v_participant.id,
    'recorded_at', v_recorded_at
  );
end;
$$;

create or replace function app643_svensexaatlas.stop_sharing(p_join_token text)
returns boolean
language plpgsql
security definer
set search_path = app643_svensexaatlas, public
as $$
declare
  v_participant app643_svensexaatlas.participants%rowtype;
begin
  select *
  into v_participant
  from app643_svensexaatlas.participants
  where join_token = trim(p_join_token)
  limit 1;

  if not found then
    return false;
  end if;

  update app643_svensexaatlas.participants
  set sharing_enabled = false
  where id = v_participant.id;

  update app643_svensexaatlas.live_locations
  set
    is_active = false,
    updated_at = now()
  where participant_id = v_participant.id;

  return true;
end;
$$;
