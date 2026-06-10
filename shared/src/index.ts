export type GameMode = "party" | "case";
export type SafeLevel = "safe" | "spicy" | "adult";
export type PromptVibe = "funny" | "awkward" | "chaotic" | "roast" | "flirty" | "suspicious";
export type PromptVibeSetting = PromptVibe | "mixed";
export type RoomStatus =
  | "lobby"
  | "answering"
  | "discussion"
  | "voting"
  | "round_result"
  | "game_over";

export type AnswerFormat = "text" | "number";

export type Team = "onPrompt" | "offPrompt" | "civilian" | "criminal";

export type GameSettings = {
  mode: GameMode;
  playerCount: number;
  offPromptCount: number;
  criminalCount: number;
  rounds: number;
  safeLevel: SafeLevel;
  vibe: PromptVibeSetting;
  discussionSeconds: number;
  votingSeconds: number;
};

export type PublicPlayer = {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
  isConnected: boolean;
  isEliminated: boolean;
  isHost?: boolean;
};

export type AnswerReveal = {
  playerId: string;
  playerName: string;
  answer: string;
  isDisconnected: boolean;
};

export type VoteBreakdownItem = {
  playerId: string;
  playerName: string;
  voteCount: number;
  voterNames: string[];
  isOffPrompt: boolean;
  isCriminal: boolean;
  wasEliminated: boolean;
};

export type RoundResultView = {
  roundNumber: number;
  outcome:
    | "onPromptCaught"
    | "offPromptEscaped"
    | "caseEliminated"
    | "caseTie"
    | "caseNoVotes"
    | "civiliansWin"
    | "criminalsWin";
  outcomeText: string;
  offPromptPlayerIds: string[];
  criminalPlayerIds: string[];
  eliminatedPlayerId: string | null;
  winningTeam: "civilians" | "criminals" | null;
  voteBreakdown: VoteBreakdownItem[];
  tiedPlayerIds: string[];
};

export type RoundHistoryItem = {
  roundNumber: number;
  category: string;
  outcomeText: string;
  offPromptNames: string[];
  eliminatedName: string | null;
};

export type HostRoundView = {
  roundNumber: number;
  status: RoomStatus;
  category: string;
  answerFormat: AnswerFormat;
  participantCount: number;
  answerProgress: {
    submitted: number;
    total: number;
    disconnectedMissing: number;
  };
  voteProgress: {
    submitted: number;
    total: number;
  };
  startedAt: number;
  revealedAt: number | null;
  votingStartedAt: number | null;
  answers: AnswerReveal[];
  result: RoundResultView | null;
};

export type HostRoomState = {
  roomCode: string;
  status: RoomStatus;
  settings: GameSettings;
  players: PublicPlayer[];
  hostConnected: boolean;
  createdAt: number;
  updatedAt: number;
  canStart: boolean;
  canRevealAnswers: boolean;
  canForceRevealAnswers: boolean;
  canStartVoting: boolean;
  canEndVoting: boolean;
  canAdvanceRound: boolean;
  currentRound: HostRoundView | null;
  roundHistory: RoundHistoryItem[];
  finalResult: RoundResultView | null;
};

export type PlayerRoundView = {
  roundNumber: number;
  status: RoomStatus;
  answerFormat: AnswerFormat;
  privatePrompt: string | null;
  answerSubmitted: boolean;
  voteSubmitted: boolean;
  eligibleVoteTargets: PublicPlayer[];
  result: RoundResultView | null;
  isParticipant: boolean;
};

export type PlayerRoomState = {
  roomCode: string;
  status: RoomStatus;
  settings: GameSettings;
  player: PublicPlayer;
  players: PublicPlayer[];
  isSpectator: boolean;
  roleReveal: Team | null;
  currentRound: PlayerRoundView | null;
  roundHistory: RoundHistoryItem[];
  finalResult: RoundResultView | null;
};

export type ApiAck<T = unknown> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

export type CreateRoomResponse = {
  roomCode: string;
  hostSessionToken: string;
  state: HostRoomState;
};

export type JoinRoomResponse = {
  roomCode: string;
  playerId: string;
  playerSessionToken: string;
  state: PlayerRoomState;
};

export type SocketErrorPayload = {
  message: string;
};
