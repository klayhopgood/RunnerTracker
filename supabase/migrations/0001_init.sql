-- RunnerTracker initial schema

create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  default_units text not null default 'metric' check (default_units in ('metric', 'imperial')),
  created_at timestamptz not null default now()
);

create table devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  device_token_hash text not null,
  paired_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  visibility text not null check (visibility in ('public', 'private')),
  viewer_password_hash text,
  status text not null default 'draft'
    check (status in ('draft', 'countdown', 'live', 'stopped', 'archived')),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  countdown_seconds int not null default 0,
  countdown_ends_at timestamptz,
  auto_stop_minutes int,
  started_at timestamptz,
  ended_at timestamptz,
  device_id uuid references devices(id),
  distance_meters float not null default 0,
  elevation_gain_meters float not null default 0,
  duration_seconds int not null default 0,
  created_at timestamptz not null default now()
);

create index sessions_public_live on sessions (status)
  where visibility = 'public' and status = 'live';
create index sessions_slug on sessions (slug);

create table track_points (
  id bigserial primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  altitude_raw float,
  altitude_corrected float,
  accuracy float,
  speed float,
  heading float,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index track_points_session_time on track_points (session_id, recorded_at);

create table pairing_codes (
  code text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table devices enable row level security;
alter table sessions enable row level security;
alter table track_points enable row level security;
alter table pairing_codes enable row level security;

create policy "Users read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users manage own devices"
  on devices for all
  using (auth.uid() = user_id);

create policy "Users manage own sessions"
  on sessions for all
  using (auth.uid() = user_id);

create policy "Public live sessions readable"
  on sessions for select
  using (visibility = 'public' and status = 'live');

create policy "Users manage own pairing codes"
  on pairing_codes for all
  using (auth.uid() = user_id);

-- track_points: writes via service role API only; reads via API layer
create policy "No direct track point access"
  on track_points for select
  using (false);
