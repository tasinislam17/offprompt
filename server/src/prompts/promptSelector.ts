import type { GameMode, PromptVibeSetting, SafeLevel } from "@off-prompt/shared";
import type { PromptPair } from "./promptTypes.js";

type SelectPromptArgs = {
  prompts: PromptPair[];
  mode: GameMode;
  activePlayerCount: number;
  usedPromptPairIds?: Iterable<string>;
  safeLevel: SafeLevel;
  vibe?: PromptVibeSetting;
};

const safeLevelRank: Record<SafeLevel, number> = {
  safe: 1,
  spicy: 2,
  adult: 3,
};

function isSafeEnough(prompt: PromptPair, requestedLevel: SafeLevel): boolean {
  return safeLevelRank[prompt.safeLevel] <= safeLevelRank[requestedLevel];
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function selectPromptPair({
  prompts,
  mode,
  activePlayerCount,
  usedPromptPairIds = [],
  safeLevel,
  vibe = "mixed",
}: SelectPromptArgs): PromptPair {
  const usedSet = new Set(usedPromptPairIds);

  const eligible = prompts.filter((prompt) => {
    return (
      prompt.modeCompatibility.includes(mode) &&
      activePlayerCount >= prompt.minPlayers &&
      activePlayerCount <= prompt.maxPlayers &&
      isSafeEnough(prompt, safeLevel) &&
      (vibe === "mixed" || prompt.vibe === vibe)
    );
  });

  const unusedEligible = eligible.filter((prompt) => !usedSet.has(prompt.id));
  const pool = unusedEligible.length > 0 ? unusedEligible : eligible;

  if (pool.length === 0) {
    throw new Error(
      `No prompt pairs available for mode=${mode}, players=${activePlayerCount}, safeLevel=${safeLevel}, vibe=${vibe}.`
    );
  }

  return randomItem(pool);
}
