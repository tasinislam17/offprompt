import type { AnswerFormat, GameMode, PromptVibe, SafeLevel } from "@off-prompt/shared";

export type PromptPairType =
  | "open"
  | "numeric"
  | "player_dynamic"
  | "spicy"
  | "who_here"
  | "dynamic"
  | "choice"
  | "hypothetical"
  | "ranking";

export type TargetRule = "random_active_player" | null;

export type PromptPair = {
  id: string;
  category: string;
  type: PromptPairType;
  modeCompatibility: GameMode[];
  requiresTargetPlayer: boolean;
  targetRule: TargetRule;
  mainPrompt: string;
  offPrompt: string;
  answerFormat: AnswerFormat;
  minPlayers: number;
  maxPlayers: number;
  safeLevel: SafeLevel;
  vibe: PromptVibe;
  tags: string[];
};

export type RenderablePlayer = {
  id: string;
  name: string;
  isEliminated?: boolean;
  isConnected?: boolean;
};

export type RenderedPromptPair = {
  promptPairId: string;
  targetPlayerId: string | null;
  mainPrompt: string;
  offPrompt: string;
};
