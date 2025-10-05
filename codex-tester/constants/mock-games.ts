export type GameSummary = {
    id: string;
    teamOne: string;
    teamTwo: string;
    winningTeam: 'teamOne' | 'teamTwo';
    finalScore: string;
    date: string;
};

export type GameDetail = GameSummary & {
    goalScore: number;
    rounds: Array<{
        number: number;
        teamSummaries: Array<{
            teamLabel: string;
            bid: number;
            books: number;
            scoreChange: number;
            runningTotal: number;
        }>;
    }>;
};

export const GAME_SUMMARIES: GameSummary[] = [
    { id: 'game-101', teamOne: 'Avery & Kai', teamTwo: 'Jess & Malik', winningTeam: 'teamOne', finalScore: '512 – 347', date: 'Apr 2, 2024' },
    { id: 'game-102', teamOne: 'Morgan & Kai', teamTwo: 'Jordan & Reese', winningTeam: 'teamTwo', finalScore: '438 – 501', date: 'Mar 29, 2024' },
    { id: 'game-103', teamOne: 'Avery & Kai', teamTwo: 'Theo & Cam', winningTeam: 'teamOne', finalScore: '503 – 295', date: 'Mar 24, 2024' },
    { id: 'game-104', teamOne: 'Morgan & Kai', teamTwo: 'Priya & Owen', winningTeam: 'teamOne', finalScore: '547 – 410', date: 'Mar 19, 2024' },
    { id: 'game-105', teamOne: 'Sky & Kai', teamTwo: 'Lena & Pat', winningTeam: 'teamOne', finalScore: '601 – 372', date: 'Mar 15, 2024' },
    { id: 'game-106', teamOne: 'Sky & Kai', teamTwo: 'Nia & Cole', winningTeam: 'teamTwo', finalScore: '421 – 512', date: 'Mar 10, 2024' },
    { id: 'game-107', teamOne: 'Avery & Kai', teamTwo: 'Rowan & Eli', winningTeam: 'teamOne', finalScore: '487 – 325', date: 'Mar 5, 2024' },
    { id: 'game-108', teamOne: 'Morgan & Kai', teamTwo: 'Mira & Dante', winningTeam: 'teamOne', finalScore: '523 – 468', date: 'Mar 1, 2024' },
    { id: 'game-109', teamOne: 'Taylor & Kai', teamTwo: 'Isa & True', winningTeam: 'teamOne', finalScore: '552 – 497', date: 'Feb 25, 2024' },
    { id: 'game-110', teamOne: 'Taylor & Kai', teamTwo: 'Harper & Quinn', winningTeam: 'teamTwo', finalScore: '398 – 502', date: 'Feb 21, 2024' },
    { id: 'game-111', teamOne: 'Sky & Kai', teamTwo: 'Devon & Blair', winningTeam: 'teamOne', finalScore: '575 – 466', date: 'Feb 18, 2024' },
    { id: 'game-112', teamOne: 'Avery & Kai', teamTwo: 'Kade & Jules', winningTeam: 'teamOne', finalScore: '610 – 472', date: 'Feb 12, 2024' },
];

const GOAL_BY_ID: Record<string, number> = {
    'game-105': 600,
    'game-109': 550,
    'game-111': 550,
    'game-112': 600,
};

const ROUNDS_PER_GAME = 10;

const parseFinalScore = (finalScore: string) => {
    const [teamOneRaw, teamTwoRaw] = finalScore.split('–').map((part) => parseInt(part.trim(), 10));
    return { teamOneScore: teamOneRaw ?? 0, teamTwoScore: teamTwoRaw ?? 0 };
};

const makeIncrements = (total: number) => {
    const base = Math.floor(total / ROUNDS_PER_GAME);
    const remainder = total % ROUNDS_PER_GAME;
    return Array.from({ length: ROUNDS_PER_GAME }, (_, index) => base + (index < remainder ? 1 : 0));
};

const deriveBid = (delta: number) => Math.max(4, Math.min(7, Math.floor(delta / 15) + 3));
const deriveBooks = (delta: number) => Math.max(4, Math.min(13, Math.floor(delta / 12) + 4));

const buildRounds = (summary: GameSummary): GameDetail['rounds'] => {
    const { teamOneScore, teamTwoScore } = parseFinalScore(summary.finalScore);
    const teamOneChanges = makeIncrements(teamOneScore);
    const teamTwoChanges = makeIncrements(teamTwoScore);

    let runningOne = 0;
    let runningTwo = 0;

    return teamOneChanges.map((changeOne, index) => {
        const changeTwo = teamTwoChanges[index];
        runningOne += changeOne;
        runningTwo += changeTwo;

        return {
            number: index + 1,
            teamSummaries: [
                {
                    teamLabel: summary.teamOne,
                    bid: deriveBid(changeOne),
                    books: deriveBooks(changeOne),
                    scoreChange: changeOne,
                    runningTotal: runningOne,
                },
                {
                    teamLabel: summary.teamTwo,
                    bid: deriveBid(changeTwo),
                    books: deriveBooks(changeTwo),
                    scoreChange: changeTwo,
                    runningTotal: runningTwo,
                },
            ],
        };
    });
};

export const GAME_DETAILS: Record<string, GameDetail> = GAME_SUMMARIES.reduce<Record<string, GameDetail>>(
    (acc, summary) => {
        acc[summary.id] = {
            ...summary,
            goalScore: GOAL_BY_ID[summary.id] ?? 500,
            rounds: buildRounds(summary),
        };
        return acc;
    },
    {},
);
