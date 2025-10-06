import { GameDetail, GameSummary, GAME_DETAILS, GAME_SUMMARIES } from '@/constants/mock-games';

type Listener = () => void;

class SpadesStore {
  private summaries: GameSummary[];
  private details: Record<string, GameDetail>;
  private listeners: Set<Listener>;

  constructor() {
    this.summaries = [...GAME_SUMMARIES];
    this.details = { ...GAME_DETAILS };
    this.listeners = new Set();
  }

  getSummaries(): GameSummary[] {
    return [...this.summaries];
  }

  getDetail(id: string): GameDetail | undefined {
    return this.details[id];
  }

  addGame(detail: GameDetail) {
    const summary: GameSummary = {
      id: detail.id,
      teamOne: detail.teamOne,
      teamTwo: detail.teamTwo,
      winningTeam: detail.winningTeam,
      finalScore: detail.finalScore,
      date: detail.date,
    };

    this.details[detail.id] = detail;
    this.summaries = [summary, ...this.summaries];
    this.emit();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

export const spadesStore = new SpadesStore();
