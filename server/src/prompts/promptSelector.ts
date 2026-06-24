import type { GameMode } from "@off-prompt/shared";
import type { PromptPair } from "./promptTypes.js";

type SelectPromptArgs = {
  prompts: PromptPair[];
  mode: GameMode;
  activePlayerCount: number;
  usedPromptPairIds?: Iterable<string>;
};

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function selectPromptPair({
  prompts,
  mode,
  activePlayerCount,
  usedPromptPairIds = [],
}: SelectPromptArgs): PromptPair {
  const usedSet = new Set(usedPromptPairIds);

  const eligible = prompts.filter((prompt) => {
    return (
      prompt.modeCompatibility.includes(mode) &&
      activePlayerCount >= prompt.minPlayers &&
      activePlayerCount <= prompt.maxPlayers
    );
  });

  const unusedEligible = eligible.filter((prompt) => !usedSet.has(prompt.id));
  const pool = unusedEligible.length > 0 ? unusedEligible : eligible;

  if (pool.length === 0) {
    throw new Error(`No prompt pairs available for mode=${mode}, players=${activePlayerCount}.`);
  }

  return randomItem(pool);
}
