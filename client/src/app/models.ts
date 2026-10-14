export type Phase = 'LOBBY' | 'QUESTION' | 'REVEAL' | 'FINAL';
export interface Row { name: string; score: number }

export interface QuestionData {
  index: number; total: number; text: string; options: string[];
  time: number; endsAt: number; now: number; yourAnswer?: number | null;
}

export interface RevealData {
  correct: number; options: string[]; yourAnswer: number | null;
  gain: number; score: number; position: number; top: Row[]; isLast: boolean;
}

export interface JoinResult {
  ok: boolean;
  error?: string;
  name?: string;
  phase?: Phase;
  question?: QuestionData | null;
  reveal?: RevealData | null;
  leaderboard?: Row[] | null;
}