import { supabase } from '@/src/shared/supabase-client';

export type SpadesTeamMember = {
  slot: number;
  type: 'user' | 'guest';
  displayName: string;
  userId?: string;
  guestId?: string;
};

export type SpadesTeam = {
  id: string;
  label: string;
  createdAt: string | null;
  members: SpadesTeamMember[];
  archived: boolean;
};

export type SpadesMatchSummary = {
  gameId: string;
  playedOn: string | null;
  team1Name: string;
  team2Name: string;
  team1Total: number | null;
  team2Total: number | null;
  goalScore: number;
  status: string;
  winnerTeamNo: 1 | 2 | null;
};

export type SpadesRound = {
  number: number;
  teamSummaries: Array<{
    teamId: string;
    teamLabel: string;
    bid: number;
    books: number;
    scoreChange: number;
    runningTotal: number;
  }>;
};

export type SpadesGameDetail = {
  gameId: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  team1Total: number | null;
  team2Total: number | null;
  goalScore: number;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  rounds: SpadesRound[];
};

export type GameRecordSummary = {
  key: string;
  label: string;
  wins: number;
  losses: number;
  ties: number;
  games: number;
};

type TeamRow = {
  id: string;
  name: string | null;
  created_at: string | null;
  archived: boolean | null;
};

type TeamMemberRow = {
  team_id: string;
  slot: number;
  user_id: string | null;
  guest_id: string | null;
};

type TeamLabelRow = {
  team_id: string;
  team_name: string | null;
};

type GuestRow = {
  id: string;
  display_name: string;
};

type SpadesGameRow = {
  id: string;
  goal_score: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  team1_id: string;
  team2_id: string;
};

type MatchCardRow = {
  game_id: string;
  played_on: string | null;
  team1_name: string | null;
  team2_name: string | null;
  team1_total: number | null;
  team2_total: number | null;
  goal_score: number;
  status: string;
  winner_team_no: number | null;
};

type RoundHistoryRow = {
  hand_no: number;
  team1_bid: number;
  team1_books: number;
  team1_delta: number;
  team1_total_after: number;
  team2_bid: number;
  team2_books: number;
  team2_delta: number;
  team2_total_after: number;
};

type ProfileRow = {
  user_id: string;
  display_name: string;
};

const hydrateTeams = async (teamRows: TeamRow[]): Promise<SpadesTeam[]> => {
  if (teamRows.length === 0) {
    return [];
  }

  const teamIds = teamRows.map((team) => team.id);

  const [{ data: memberRows, error: membersError }, { data: labelRows, error: labelsError }] = await Promise.all([
    supabase
      .from('team_members')
      .select('team_id, slot, user_id, guest_id')
      .in('team_id', teamIds)
      .order('slot', { ascending: true }),
    supabase.from('v_team_label').select('team_id, team_name').in('team_id', teamIds),
  ]);

  if (membersError) {
    throw membersError;
  }
  if (labelsError) {
    throw labelsError;
  }

  const members = (memberRows as TeamMemberRow[] | null) ?? [];
  const labels = (labelRows as TeamLabelRow[] | null) ?? [];

  const userIds = Array.from(
    new Set(members.map((member) => member.user_id).filter((id): id is string => Boolean(id))),
  );
  const guestIds = Array.from(
    new Set(members.map((member) => member.guest_id).filter((id): id is string => Boolean(id))),
  );

  let profiles: ProfileRow[] = [];
  let guests: GuestRow[] = [];

  if (userIds.length) {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);
    if (error) {
      throw error;
    }
    profiles = (data as ProfileRow[] | null) ?? [];
  }

  if (guestIds.length) {
    const { data, error } = await supabase
      .from('team_guests')
      .select('id, display_name')
      .in('id', guestIds);
    if (error) {
      throw error;
    }
    guests = (data as GuestRow[] | null) ?? [];
  }

  const labelMap = new Map(labels.map((row) => [row.team_id, row.team_name ?? '']));
  const profileMap = new Map(profiles.map((row) => [row.user_id, row.display_name]));
  const guestMap = new Map(guests.map((row) => [row.id, row.display_name]));

  return teamRows.map((team) => {
    const teamMembers = members.filter((member) => member.team_id === team.id);
    const membersWithNames: SpadesTeamMember[] = teamMembers.map((member) => {
      if (member.user_id) {
        return {
          slot: member.slot,
          type: 'user' as const,
          displayName: profileMap.get(member.user_id) ?? 'Unknown Player',
          userId: member.user_id,
        };
      }
      if (member.guest_id) {
        return {
          slot: member.slot,
          type: 'guest' as const,
          displayName: guestMap.get(member.guest_id) ?? 'Guest Player',
          guestId: member.guest_id,
        };
      }
      return {
        slot: member.slot,
        type: 'guest' as const,
        displayName: 'Guest Player',
      };
    });

    membersWithNames.sort((a, b) => a.slot - b.slot);

    const label = labelMap.get(team.id) ?? team.name ?? 'Spades Team';

    return {
      id: team.id,
      label,
      createdAt: team.created_at ?? null,
      members: membersWithNames,
      archived: Boolean(team.archived),
    };
  });
};

export async function fetchTeamsForUser(userId: string): Promise<SpadesTeam[]> {
  const { data: teamRows, error } = await supabase
    .from('teams')
    .select('id, name, created_at, archived')
    .eq('created_by', userId)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return hydrateTeams(((teamRows as TeamRow[] | null) ?? []));
}

type CreateTeamParams = {
  createdBy: string;
  teamName: string;
  partnerUserId?: string;
  guestName?: string;
};

export async function createTeamForUser(params: CreateTeamParams): Promise<SpadesTeam> {
  const { createdBy, teamName, partnerUserId, guestName } = params;

  if (!teamName.trim()) {
    throw new Error('Team name is required.');
  }

  if (!partnerUserId && !guestName) {
    throw new Error('Provide either a partner user ID or a guest name.');
  }

  const { data: teamRow, error: teamError } = await supabase
    .from('teams')
    .insert({
      name: teamName.trim(),
      created_by: createdBy,
      archived: false,
    })
    .select('id, name, created_at, archived')
    .single();

  if (teamError || !teamRow) {
    throw teamError ?? new Error('Failed to create team.');
  }

  const cleanupOnError = async () => {
    await supabase.from('teams').delete().eq('id', teamRow.id);
  };

  try {
    const memberRows: Array<{ team_id: string; slot: number; user_id?: string; guest_id?: string }> = [
      {
        team_id: teamRow.id,
        slot: 1,
        user_id: createdBy,
      },
    ];

    if (partnerUserId) {
      memberRows.push({
        team_id: teamRow.id,
        slot: 2,
        user_id: partnerUserId,
      });
    } else if (guestName) {
      const { data: guestRow, error: guestError } = await supabase
        .from('team_guests')
        .insert({
          team_id: teamRow.id,
          display_name: guestName.trim(),
        })
        .select('id, display_name')
        .single();

      if (guestError || !guestRow) {
        throw guestError ?? new Error('Failed to create guest player.');
      }

      memberRows.push({
        team_id: teamRow.id,
        slot: 2,
        guest_id: guestRow.id,
      });
    }

    const { error: membersError } = await supabase.from('team_members').insert(memberRows);
    if (membersError) {
      throw membersError;
    }

    const [team] = await hydrateTeams([teamRow]);
    if (!team) {
      throw new Error('Failed to load created team.');
    }

    return team;
  } catch (error) {
    await cleanupOnError();
    throw error;
  }
}

type UpdateTeamNameParams = {
  teamId: string;
  userId: string;
  teamName: string;
};

export async function updateTeamName({ teamId, userId, teamName }: UpdateTeamNameParams) {
  const trimmed = teamName.trim();
  if (!trimmed) {
    throw new Error('Team name is required.');
  }
  const { error } = await supabase
    .from('teams')
    .update({ name: trimmed })
    .eq('id', teamId)
    .eq('created_by', userId)
    .eq('archived', false);

  if (error) {
    throw error;
  }
}

type ConvertGuestParams = {
  teamId: string;
  guestId: string;
  newUserId: string;
};

export async function convertGuestToRegistered({ teamId, guestId, newUserId }: ConvertGuestParams) {
  const { data: guestMember, error: memberError } = await supabase
    .from('team_members')
    .select('slot')
    .eq('team_id', teamId)
    .eq('guest_id', guestId)
    .maybeSingle();

  if (memberError) {
    throw memberError;
  }

  if (!guestMember) {
    throw new Error('Guest player not found on this team.');
  }

  const { data: existingUserMember, error: checkError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('user_id', newUserId)
    .maybeSingle();

  if (checkError) {
    throw checkError;
  }

  if (existingUserMember) {
    throw new Error('That player is already on this team.');
  }

  const { error: updateError } = await supabase
    .from('team_members')
    .update({ guest_id: null, user_id: newUserId })
    .eq('team_id', teamId)
    .eq('slot', guestMember.slot);

  if (updateError) {
    throw updateError;
  }

  const { error: deleteError } = await supabase.from('team_guests').delete().eq('id', guestId);
  if (deleteError) {
    throw deleteError;
  }
}

export async function archiveTeam(teamId: string, userId: string) {
  const { error } = await supabase
    .from('teams')
    .update({ archived: true })
    .eq('id', teamId)
    .eq('created_by', userId)
    .eq('archived', false);

  if (error) {
    throw error;
  }
}

export async function unarchiveTeam(teamId: string, userId: string) {
  const { error } = await supabase
    .from('teams')
    .update({ archived: false })
    .eq('id', teamId)
    .eq('created_by', userId)
    .eq('archived', true);

  if (error) {
    throw error;
  }
}

export async function fetchArchivedTeamsForUser(userId: string): Promise<SpadesTeam[]> {
  const { data: teamRows, error } = await supabase
    .from('teams')
    .select('id, name, created_at, archived')
    .eq('created_by', userId)
    .eq('archived', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return hydrateTeams(((teamRows as TeamRow[] | null) ?? []));
}

export async function fetchTeamById(teamId: string): Promise<SpadesTeam | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, created_at, archived')
    .eq('id', teamId)
    .maybeSingle<TeamRow>();

  if (error) {
    throw error;
  }

  if (!data || data.archived) {
    return null;
  }

  const teams = await hydrateTeams([data]);
  return teams[0] ?? null;
}

export async function fetchProfileGameRecords(userId: string): Promise<GameRecordSummary[]> {
  const { data, error } = await supabase
    .from('player_stats_users')
    .select('games, wins, losses, ties')
    .eq('user_id', userId)
    .maybeSingle<{ games: number; wins: number; losses: number; ties: number }>();

  if (error) {
    throw error;
  }

  const games = data?.games ?? 0;
  const wins = data?.wins ?? 0;
  const losses = data?.losses ?? 0;
  const ties = data?.ties ?? games - wins - losses;

  return [
    {
      key: 'spades',
      label: 'Spades',
      wins,
      losses,
      ties,
      games,
    },
  ];
}

export async function fetchSpadesMatchSummaries(userId: string): Promise<SpadesMatchSummary[]> {
  // Find games the user participated in (registered players only) and games they created
  const [memberGameIdsResult, createdGameIdsResult] = await Promise.all([
    supabase
      .from('spades_game_team_members')
      .select('game_id')
      .eq('user_id', userId),
    supabase
      .from('spades_games')
      .select('id')
      .eq('created_by', userId),
  ]);

  const memberGameRows = (memberGameIdsResult.data as Array<{ game_id: string }> | null) ?? [];
  const createdGameRows = (createdGameIdsResult.data as Array<{ id: string }> | null) ?? [];

  const combinedIds = Array.from(
    new Set<string>([
      ...memberGameRows.map((r) => r.game_id),
      ...createdGameRows.map((r) => r.id),
    ].filter(Boolean)),
  );

  if (memberGameIdsResult.error) {
    throw memberGameIdsResult.error;
  }
  if (createdGameIdsResult.error) {
    throw createdGameIdsResult.error;
  }

  if (combinedIds.length === 0) {
    return [];
  }

  const { data: gameRows, error: gamesError } = await supabase
    .from('spades_games')
    .select('id, goal_score, status, started_at, ended_at, team1_id, team2_id')
    .in('id', combinedIds)
    .order('started_at', { ascending: false });

  if (gamesError) {
    throw gamesError;
  }

  const games = (gameRows as SpadesGameRow[] | null) ?? [];

  if (!games.length) {
    return [];
  }

  const gameIds = games.map((game) => game.id);

  const { data: cardRows, error: cardsError } = await supabase
    .from('v_spades_match_card')
    .select('game_id, played_on, team1_name, team2_name, team1_total, team2_total, goal_score, status, winner_team_no')
    .in('game_id', gameIds);

  if (cardsError) {
    throw cardsError;
  }

  const cards = (cardRows as MatchCardRow[] | null) ?? [];
  const cardMap = new Map(cards.map((card) => [card.game_id, card]));

  return games.map((game) => {
    const card = cardMap.get(game.id);
    return {
      gameId: game.id,
      playedOn: card?.played_on ?? (game.started_at ?? null),
      team1Name: card?.team1_name ?? 'Team One',
      team2Name: card?.team2_name ?? 'Team Two',
      team1Total: card?.team1_total ?? null,
      team2Total: card?.team2_total ?? null,
      goalScore: card?.goal_score ?? game.goal_score,
      status: card?.status ?? game.status,
      winnerTeamNo: (card?.winner_team_no as 1 | 2 | null) ?? null,
    };
  });
}

export async function fetchSpadesGameDetail(gameId: string): Promise<SpadesGameDetail | null> {
  const [{ data: game, error: gameError }, { data: card, error: cardError }] = await Promise.all([
    supabase
      .from('spades_games')
      .select('id, created_by, team1_id, team2_id, goal_score, status, started_at, ended_at')
      .eq('id', gameId)
      .maybeSingle(),
    supabase
      .from('v_spades_match_card')
      .select('game_id, team1_name, team2_name, team1_total, team2_total, goal_score, status, played_on, winner_team_no')
      .eq('game_id', gameId)
      .maybeSingle(),
  ]);

  if (gameError) {
    throw gameError;
  }
  const gameRow = (game as SpadesGameRow | null) ?? null;
  if (!gameRow) {
    return null;
  }
  if (cardError) {
    throw cardError;
  }

  const { data: roundRows, error: roundsError } = await supabase
    .from('v_spades_round_history')
    .select(
      'hand_no, team1_bid, team1_books, team1_delta, team1_total_after, team2_bid, team2_books, team2_delta, team2_total_after',
    )
    .eq('game_id', gameId)
    .order('hand_no', { ascending: true });

  if (roundsError) {
    throw roundsError;
  }

  const cardRow = (card as MatchCardRow | null) ?? null;
  const team1Name = cardRow?.team1_name ?? 'Team One';
  const team2Name = cardRow?.team2_name ?? 'Team Two';

  const rounds = (roundRows as RoundHistoryRow[] | null) ?? [];

  const formattedRounds: SpadesRound[] =
    rounds.map((round) => ({
      number: round.hand_no,
      teamSummaries: [
        {
          teamId: gameRow.team1_id,
          teamLabel: team1Name,
          bid: round.team1_bid,
          books: round.team1_books,
          scoreChange: round.team1_delta,
          runningTotal: round.team1_total_after,
        },
        {
          teamId: gameRow.team2_id,
          teamLabel: team2Name,
          bid: round.team2_bid,
          books: round.team2_books,
          scoreChange: round.team2_delta,
          runningTotal: round.team2_total_after,
        },
      ],
    })) ?? [];

  return {
    gameId: gameRow.id,
    team1Id: gameRow.team1_id,
    team2Id: gameRow.team2_id,
    team1Name,
    team2Name,
    team1Total: cardRow?.team1_total ?? null,
    team2Total: cardRow?.team2_total ?? null,
    goalScore: cardRow?.goal_score ?? gameRow.goal_score,
    status: cardRow?.status ?? gameRow.status,
    startedAt: gameRow.started_at ?? null,
    endedAt: gameRow.ended_at ?? null,
    rounds: formattedRounds,
  };
}

type CreateHandPayload = {
  hand_no: number;
  team1_bid: number;
  team1_books: number;
  team1_delta: number;
  team1_total_after: number;
  team2_bid: number;
  team2_books: number;
  team2_delta: number;
  team2_total_after: number;
};

type CreateSpadesGameParams = {
  createdBy: string;
  team1Id: string;
  team2Id: string;
  goalScore: number;
  rounds: SpadesRound[];
  team1Members: SpadesTeamMember[];
  team2Members: SpadesTeamMember[];
  startedAt?: Date;
  endedAt?: Date | null;
};

export async function createSpadesGame(params: CreateSpadesGameParams): Promise<string> {
  const { createdBy, team1Id, team2Id, goalScore, rounds, team1Members, team2Members, startedAt, endedAt } = params;

  const startedAtValue = startedAt ?? new Date();
  const endedAtValue = endedAt ?? new Date();

  if (rounds.length === 0) {
    throw new Error('At least one round is required to record a game.');
  }

  const { data: gameRow, error: gameError } = await supabase
    .from('spades_games')
    .insert({
      created_by: createdBy,
      team1_id: team1Id,
      team2_id: team2Id,
      goal_score: goalScore,
      status: 'in_progress',
      started_at: startedAtValue.toISOString(),
      ended_at: endedAtValue.toISOString(),
    })
    .select('id')
    .single<{ id: string }>();

  if (gameError || !gameRow) {
    throw gameError ?? new Error('Failed to create game.');
  }

  const cleanupOnError = async () => {
    await supabase.from('spades_games').delete().eq('id', gameRow.id);
    await supabase.from('spades_game_team_members').delete().eq('game_id', gameRow.id);
  };

  try {
    const memberSnapshots = [
      ...team1Members.map((member) => ({
        game_id: gameRow.id,
        team_id: team1Id,
        slot: member.slot,
        user_id: member.type === 'user' ? member.userId ?? null : null,
        guest_id: member.type === 'guest' ? member.guestId ?? null : null,
      })),
      ...team2Members.map((member) => ({
        game_id: gameRow.id,
        team_id: team2Id,
        slot: member.slot,
        user_id: member.type === 'user' ? member.userId ?? null : null,
        guest_id: member.type === 'guest' ? member.guestId ?? null : null,
      })),
    ];

    const { error: snapshotError } = await supabase.from('spades_game_team_members').insert(memberSnapshots);
    if (snapshotError) {
      throw snapshotError;
    }

    const handPayloads: CreateHandPayload[] = rounds.map((round) => {
      const teamOneEntry = round.teamSummaries.find((entry) => entry.teamId === team1Id);
      const teamTwoEntry = round.teamSummaries.find((entry) => entry.teamId === team2Id);

      if (!teamOneEntry || !teamTwoEntry) {
        throw new Error('Rounds must include scoring for both teams.');
      }

      return {
        hand_no: round.number,
        team1_bid: teamOneEntry.bid,
        team1_books: teamOneEntry.books,
        team1_delta: teamOneEntry.scoreChange,
        team1_total_after: teamOneEntry.runningTotal,
        team2_bid: teamTwoEntry.bid,
        team2_books: teamTwoEntry.books,
        team2_delta: teamTwoEntry.scoreChange,
        team2_total_after: teamTwoEntry.runningTotal,
      };
    });

    if (handPayloads.length === 0) {
      throw new Error('At least one hand is required to record a game.');
    }

    const insertPayload = handPayloads.map((hand) => ({
      game_id: gameRow.id,
      ...hand,
    }));

    const { error: handsError } = await supabase.from('spades_hands').insert(insertPayload);
    if (handsError) {
      throw handsError;
    }

    const { error: finishError } = await supabase.rpc('finish_spades_game', {
      p_game_id: gameRow.id,
    });

    if (finishError) {
      throw finishError;
    }

    return gameRow.id;
  } catch (error) {
    await cleanupOnError();
    throw error;
  }
}
