import type { GameSettings } from "@off-prompt/shared";

export const defaultSettings: GameSettings = {
  mode: "party",
  playerCount: 3,
  offPromptCount: 1,
  criminalCount: 1,
  rounds: 5,
  safeLevel: "safe",
  vibe: "mixed",
  discussionSeconds: 0,
  votingSeconds: 60,
};

export function maxOffPromptCount(playerCount: number): number {
  if (playerCount >= 9) {
    return 3;
  }
  if (playerCount >= 7) {
    return 2;
  }
  return 1;
}

export function maxCriminalCount(playerCount: number): number {
  return playerCount >= 7 ? 2 : 1;
}

export function recommendedCriminalCount(playerCount: number): number {
  return playerCount >= 8 ? 2 : 1;
}
