import type {
  AnswerFormat,
  GameSettings,
  HostRoomState,
  PlayerRoomState,
  RoomStatus,
  RoundHistoryItem,
  RoundResultView,
  Team,
} from "@off-prompt/shared";

export type PlayerState = {
  id: string;
  sessionToken: string;
  socketId: string | null;
  name: string;
  score: number;
  isReady: boolean;
  isConnected: boolean;
  isEliminated: boolean;
  joinedAt: number;
  lastSeenAt: number;
  role: Team | null;
};

export type RoundState = {
  id: string;
  number: number;
  status: RoomStatus;
  promptPairId: string;
  category: string;
  mainPrompt: string;
  answerFormat: AnswerFormat;
  targetPlayerId: string | null;
  participantIds: string[];
  offPromptPlayerIds: string[];
  criminalPlayerIds: string[];
  promptByPlayerId: Record<string, string>;
  answers: Record<string, string>;
  votes: Record<string, string>;
  startedAt: number;
  revealedAt: number | null;
  votingStartedAt: number | null;
  result: RoundResultView | null;
};

export type RoomState = {
  roomCode: string;
  hostSessionToken: string;
  hostSocketId: string | null;
  hostConnected: boolean;
  settings: GameSettings;
  status: RoomStatus;
  players: Map<string, PlayerState>;
  usedPromptPairIds: Set<string>;
  currentRound: RoundState | null;
  roundHistory: RoundHistoryItem[];
  finalResult: RoundResultView | null;
  criminalPlayerIds: Set<string>;
  lastOffPromptPlayerIds: string[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

export type RoomSnapshot = {
  host: HostRoomState;
  players: PlayerRoomState[];
};
