-- ========== USERS ==========
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default timezone('utc', now())
);

-- ========== TEAMS ==========
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_by uuid not null references profiles(user_id) on delete restrict,
  created_at timestamptz default timezone('utc', now())
);

create table if not exists public.team_guests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default timezone('utc', now())
);

create table if not exists public.team_members (
  team_id uuid not null references teams(id) on delete cascade,
  slot smallint not null check (slot in (1,2)),
  user_id uuid references profiles(user_id) on delete cascade,
  guest_id uuid references team_guests(id) on delete cascade,
  check ((user_id is not null) <> (guest_id is not null)),
  primary key (team_id, slot)
);

create unique index if not exists team_members_user_idx on public.team_members (team_id, user_id) where user_id is not null;
create unique index if not exists team_members_guest_idx on public.team_members (team_id, guest_id) where guest_id is not null;

-- ========== GAMES (Spades-only for now) ==========
create table if not exists public.spades_games (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles(user_id) on delete restrict,
  team1_id uuid not null references teams(id) on delete restrict,
  team2_id uuid not null references teams(id) on delete restrict,
  goal_score int not null default 500,
  status text not null default 'in_progress',
  started_at timestamptz default timezone('utc', now()),
  ended_at timestamptz
);

create table if not exists public.spades_hands (
  id bigserial primary key,
  game_id uuid not null references spades_games(id) on delete cascade,
  hand_no int not null,
  team1_bid int not null,
  team2_bid int not null,
  team1_books int not null,
  team2_books int not null,
  team1_delta int not null,
  team2_delta int not null,
  team1_total_after int not null,
  team2_total_after int not null,
  unique (game_id, hand_no)
);

create index if not exists spades_games_created_by_idx on public.spades_games (created_by, status, started_at desc);
create index if not exists spades_hands_game_idx on public.spades_hands (game_id, hand_no);

-- ========== Views for labels ==========
create or replace view public.v_team_label as
with nm as (
  select tm.team_id,
         string_agg(
           coalesce(p.display_name, tg.display_name),
           ' & ' order by tm.slot
         ) as derived
  from team_members tm
  left join profiles p on p.user_id = tm.user_id
  left join team_guests tg on tg.id = tm.guest_id
  group by tm.team_id
)
select t.id as team_id,
       coalesce(t.name, nm.derived) as team_name
from teams t
left join nm on nm.team_id = t.id;

create or replace view public.v_spades_match_card as
with last_totals as (
  select game_id,
         (array_agg(team1_total_after order by hand_no desc))[1] as t1,
         (array_agg(team2_total_after order by hand_no desc))[1] as t2
  from spades_hands group by game_id
)
select g.id as game_id,
       g.started_at::date as played_on,
       tl1.team_name as team1_name,
       tl2.team_name as team2_name,
       lt.t1 as team1_total,
       lt.t2 as team2_total,
       g.goal_score,
       g.status,
       case when g.status='completed' and lt.t1>lt.t2 then 1
            when g.status='completed' and lt.t2>lt.t1 then 2
            else null end as winner_team_no
from spades_games g
left join last_totals lt on lt.game_id = g.id
left join v_team_label tl1 on tl1.team_id = g.team1_id
left join v_team_label tl2 on tl2.team_id = g.team2_id;

create or replace view public.v_spades_round_history as
select h.game_id, h.hand_no,
       h.team1_bid, h.team1_books, h.team1_delta, h.team1_total_after,
       h.team2_bid, h.team2_books, h.team2_delta, h.team2_total_after
from spades_hands h
order by h.hand_no;

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_guests enable row level security;
alter table public.team_members enable row level security;
alter table public.spades_games enable row level security;
alter table public.spades_hands enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile"
  on public.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own teams" on public.teams;
create policy "Users manage own teams"
  on public.teams
  for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop policy if exists "Users manage own team guests" on public.team_guests;
create policy "Users manage own team guests"
  on public.team_guests
  for all
  using (exists(select 1 from teams t where t.id = team_id and t.created_by = auth.uid()))
  with check (exists(select 1 from teams t where t.id = team_id and t.created_by = auth.uid()));

drop policy if exists "Users manage own team members" on public.team_members;
create policy "Users manage own team members"
  on public.team_members
  for all
  using (exists(select 1 from teams t where t.id = team_id and t.created_by = auth.uid()))
  with check (exists(select 1 from teams t where t.id = team_id and t.created_by = auth.uid()));

drop policy if exists "Users manage own games" on public.spades_games;
create policy "Users manage own games"
  on public.spades_games
  for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop policy if exists "Users manage own hands" on public.spades_hands;
create policy "Users manage own hands"
  on public.spades_hands
  for all
  using (exists(select 1 from spades_games g where g.id = game_id and g.created_by = auth.uid()))
  with check (exists(select 1 from spades_games g where g.id = game_id and g.created_by = auth.uid()));

-- Automatically seed a profile whenever a new auth user is created.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_name text;
begin
  derived_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1),
    'Player'
  );

  insert into public.profiles (user_id, display_name, avatar_url)
  values (new.id, derived_name, new.raw_user_meta_data ->> 'avatar_url')
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        created_at = coalesce(public.profiles.created_at, excluded.created_at);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
