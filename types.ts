export interface Word {
  id: number;
  term: string;    // English
  meaning: string; // Vietnamese
  ipa: string;     // IPA from Oxford Dictionary
  pos?: string;    // Part of speech (noun, verb, etc.)
}

export enum Stage {
  IMPORT = 'IMPORT',
  STAGE_A = 'STAGE_A',       // Multiple Choice
  SUMMARY_A = 'SUMMARY_A',
  STAGE_B = 'STAGE_B',       // Typing
  FINAL_SUMMARY = 'FINAL_SUMMARY'
}

export type WordStatus = 'new' | 'learning' | 'review' | 'mastered';

export interface QuizStats {
  correct: number;
  incorrect: number;
  totalAttempts: number;
  incorrectWords: number[]; // IDs of words answered incorrectly at least once
}

export interface SRSQueueItem {
  wordId: number;
  cooldown: number; // How many questions to wait before showing again
}