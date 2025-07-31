export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isClueGiver: boolean;
  score: number;
  isConnected: boolean;
  lastSeen: number;
  submittedClues?: SubmittedClue[]; // New field for submitted clues
}

export interface SubmittedClue {
  id: string;
  playerId: string;
  playerName: string;
  scaleId: string;
  clue: string;
  used: boolean; // Whether this clue has been used in a round
  roundUsed?: number; // Which round this clue was used in
  scale?: Scale; // The unique scale for this clue
}

export interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
  players: string[]; // player IDs
}

export interface Scale {
  id: string;
  leftLabel: string;
  rightLabel: string;
  targetValue: number; // 0-100
  clue?: string;
}

export interface Guess {
  playerId: string;
  value: number; // 0-100
  timestamp: number;
}

export interface Round {
  id: string;
  roundNumber: number;
  clueGiverId: string;
  clueGiverName: string;
  scales: Scale[];
  guesses: Guess[];
  isCluePhase: boolean;
  isGuessingPhase: boolean;
  isRevealPhase: boolean;
  cluePhaseEndTime: number;
  guessingPhaseEndTime?: number;
  scores?: Record<string, number>;
  usedClue?: SubmittedClue; // The clue being used in this round
}

export interface GameState {
  id: string;
  shortCode?: string; // Short code for joining games
  status: 'lobby' | 'clue-submission' | 'active' | 'playing' | 'finished'; // Added 'clue-submission'
  players: Player[];
  teams: Team[];
  currentRound?: Round;
  roundNumber: number;
  totalRounds: number;
  gameMode: 'free-for-all' | 'teams';
  createdAt: number;
  updatedAt: number;
  allScales?: Scale[]; // All scales for the game
  cluesPerPlayer?: number; // How many clues each player should submit
  clueSubmissionEndTime?: number; // When clue submission phase ends
  playerOrder?: string[]; // Semi-random player order for the game
  settings: {
    clueTimeLimit: number; // seconds
    guessingTimeLimit: number; // seconds
    roundsPerGame: number;
    maxPlayers: number;
  };
}

export interface GameSettings {
  clueTimeLimit: number;
  guessingTimeLimit: number;
  roundsPerGame: number;
  maxPlayers: number;
  gameMode: 'free-for-all' | 'teams';
}

export interface User {
  id: string;
  name: string;
  isAnonymous: boolean;
  lastSeen: number;
}

export interface GameInvite {
  gameId: string;
  code: string;
  expiresAt: number;
}

export type GameEvent = 
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; playerId: string }
  | { type: 'game_started'; gameState: GameState }
  | { type: 'round_started'; round: Round }
  | { type: 'clue_submitted'; playerId: string; scaleId: string; clue: string }
  | { type: 'guess_submitted'; guess: Guess }
  | { type: 'round_ended'; round: Round; scores: Record<string, number> }
  | { type: 'game_ended'; finalScores: Record<string, number> }; 