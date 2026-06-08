import type { GameSettings, SafeLevel } from "@off-prompt/shared";

const safeLevels = new Set<SafeLevel>(["safe", "teen", "adult"]);

export function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isInteger(value)) {
    throw new Error(`Expected an integer between ${min} and ${max}.`);
  }
  if (value < min || value > max) {
    throw new Error(`Expected a value between ${min} and ${max}.`);
  }
  return value;
}

export function sanitizeName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 20) {
    throw new Error("Name must be 2 to 20 characters.");
  }
  return name;
}

export function normalizeAnswer(value: string, answerFormat: "text" | "number"): string {
  const answer = value.trim().replace(/\s+/g, " ");
  if (answer.length === 0) {
    throw new Error("Answer cannot be empty.");
  }
  if (answer.length > 80) {
    throw new Error("Answer must be 80 characters or fewer.");
  }
  if (answerFormat === "number") {
    if (!/^\d{1,5}$/.test(answer)) {
      throw new Error("This prompt needs a whole number from 0 to 99999.");
    }
  }
  return answer;
}

export function maxOffPromptCount(playerCount: number): number {
  if (playerCount >= 9) {
    return 3;
  }
  if (playerCount >= 7) {
    return 2;
  }
  return 1;
}

export function recommendedCriminalCount(playerCount: number): number {
  if (playerCount >= 8) {
    return 2;
  }
  return 1;
}

export function maxCriminalCount(playerCount: number): number {
  return playerCount >= 7 ? 2 : 1;
}

export function validateSettings(settings: GameSettings): GameSettings {
  if (settings.mode !== "party" && settings.mode !== "case") {
    throw new Error("Choose Party Mode or Case Mode.");
  }

  const playerCount = clampInteger(settings.playerCount, 3, 10);
  const rounds = clampInteger(settings.rounds, 3, 10);
  const offPromptCount = clampInteger(settings.offPromptCount, 1, maxOffPromptCount(playerCount));
  const criminalCount = clampInteger(settings.criminalCount, 1, maxCriminalCount(playerCount));
  const discussionSeconds = clampInteger(settings.discussionSeconds, 30, 240);
  const votingSeconds = clampInteger(settings.votingSeconds, 30, 180);

  if (!safeLevels.has(settings.safeLevel)) {
    throw new Error("Choose a valid prompt safety level.");
  }

  return {
    ...settings,
    playerCount,
    rounds,
    offPromptCount,
    criminalCount,
    discussionSeconds,
    votingSeconds,
  };
}
