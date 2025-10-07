alter table public.spades_games drop column if exists winning_team;
alter table public.spades_games drop column if exists team1_score;
alter table public.spades_games drop column if exists team2_score;

-- Snapshot and stats maintenance helpers
create or replace function public.apply_outcome_delta(p_game_id uuid, p_delta int)
returns void language plpgsql as $$
declare
  g record;
  t1_result text;
  t2_result text;
begin
  select * into g from spades_game_outcomes where game_id = p_game_id;
  if not found then
    raise exception 'Outcome % not found', p_game_id;
  end if;

  t1_result := case when g.winner_team_id is null then 'tie'
                    when g.winner_team_id = g.team1_id then 'win'
                    else 'loss' end;
  t2_result := case when g.winner_team_id is null then 'tie'
                    when g.winner_team_id = g.team2_id then 'win'
                    else 'loss' end;

  insert into team_stats(team_id) values (g.team1_id)
    on conflict (team_id) do nothing;
  update team_stats set
    games = games + p_delta,
    wins  = wins  + (case when t1_result='win'  then p_delta else 0 end),
    losses= losses+ (case when t1_result='loss' then p_delta else 0 end),
    ties  = ties  + (case when t1_result='tie'  then p_delta else 0 end),
    points_for     = points_for     + (p_delta * g.team1_total),
    points_against = points_against + (p_delta * g.team2_total),
    last_game_at   = case when p_delta>0 then greatest(coalesce(last_game_at, 'epoch'), g.completed_at)
                          else last_game_at end
  where team_id = g.team1_id;

  insert into team_stats(team_id) values (g.team2_id)
    on conflict (team_id) do nothing;
  update team_stats set
    games = games + p_delta,
    wins  = wins  + (case when t2_result='win'  then p_delta else 0 end),
    losses= losses+ (case when t2_result='loss' then p_delta else 0 end),
    ties  = ties  + (case when t2_result='tie'  then p_delta else 0 end),
    points_for     = points_for     + (p_delta * g.team2_total),
    points_against = points_against + (p_delta * g.team1_total),
    last_game_at   = case when p_delta>0 then greatest(coalesce(last_game_at, 'epoch'), g.completed_at)
                          else last_game_at end
  where team_id = g.team2_id;

  insert into player_stats_users(user_id)
    select distinct user_id
    from spades_game_team_members
    where game_id = p_game_id and user_id is not null
  on conflict (user_id) do nothing;

  update player_stats_users ps set
    games = games + p_delta,
    wins  = wins  + (case when g.winner_team_id = sgtm.team_id then p_delta else 0 end),
    losses= losses+ (case when g.winner_team_id is not null and g.winner_team_id <> sgtm.team_id then p_delta else 0 end),
    ties  = ties  + (case when g.winner_team_id is null then p_delta else 0 end),
    last_game_at = case when p_delta>0 then greatest(coalesce(last_game_at, 'epoch'), g.completed_at)
                        else last_game_at end
  from spades_game_team_members sgtm
  where sgtm.game_id = p_game_id and sgtm.user_id = ps.user_id;

  insert into player_stats_guests(guest_id)
    select distinct guest_id
    from spades_game_team_members
    where game_id = p_game_id and guest_id is not null
  on conflict (guest_id) do nothing;

  update player_stats_guests pg set
    games = games + p_delta,
    wins  = wins  + (case when g.winner_team_id = sgtm.team_id then p_delta else 0 end),
    losses= losses+ (case when g.winner_team_id is not null and g.winner_team_id <> sgtm.team_id then p_delta else 0 end),
    ties  = ties  + (case when g.winner_team_id is null then p_delta else 0 end),
    last_game_at = case when p_delta>0 then greatest(coalesce(last_game_at, 'epoch'), g.completed_at)
                        else last_game_at end
  from spades_game_team_members sgtm
  where sgtm.game_id = p_game_id and sgtm.guest_id = pg.guest_id;
end;
$$;

create or replace function public.trg_outcomes_ins() returns trigger language plpgsql as $$
begin
  perform public.apply_outcome_delta(new.game_id, +1);
  return new;
end;
$$;

create or replace function public.trg_outcomes_del() returns trigger language plpgsql as $$
begin
  perform public.apply_outcome_delta(old.game_id, -1);
  return old;
end;
$$;

create or replace function public.trg_outcomes_upd() returns trigger language plpgsql as $$
begin
  perform public.apply_outcome_delta(old.game_id, -1);
  perform public.apply_outcome_delta(new.game_id, +1);
  return new;
end;
$$;

drop trigger if exists t_outcomes_ins on spades_game_outcomes;
drop trigger if exists t_outcomes_del on spades_game_outcomes;
drop trigger if exists t_outcomes_upd on spades_game_outcomes;

create trigger t_outcomes_ins after insert on spades_game_outcomes
  for each row execute function public.trg_outcomes_ins();

create trigger t_outcomes_del after delete on spades_game_outcomes
  for each row execute function public.trg_outcomes_del();

create trigger t_outcomes_upd after update on spades_game_outcomes
  for each row execute function public.trg_outcomes_upd();

create or replace function public.finish_spades_game(p_game_id uuid)
returns void language plpgsql as $$
declare
  t1 int;
  t2 int;
  w uuid;
  g record;
begin
  select team1_id, team2_id into g from spades_games where id = p_game_id;
  if not found then
    raise exception 'Game % not found', p_game_id;
  end if;

  select (array_agg(team1_total_after order by hand_no desc))[1],
         (array_agg(team2_total_after order by hand_no desc))[1]
  into t1, t2
  from spades_hands where game_id = p_game_id;

  w := case when coalesce(t1,0) > coalesce(t2,0) then g.team1_id
            when coalesce(t2,0) > coalesce(t1,0) then g.team2_id
            else null end;

  insert into spades_game_outcomes (game_id, team1_id, team2_id, team1_total, team2_total, winner_team_id, completed_at)
  values (p_game_id, g.team1_id, g.team2_id, coalesce(t1,0), coalesce(t2,0), w, now())
  on conflict (game_id) do update
    set team1_total = excluded.team1_total,
        team2_total = excluded.team2_total,
        winner_team_id = excluded.winner_team_id,
        completed_at = excluded.completed_at;

  update spades_games
    set status = 'completed', ended_at = now()
  where id = p_game_id;
end;
$$;
