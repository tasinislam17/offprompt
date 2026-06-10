import { randomInt } from "node:crypto";
import type { GameSettings } from "@off-prompt/shared";
import type { PromptPair } from "../prompts/promptTypes.js";
import { renderPromptPair } from "../prompts/promptRenderer.js";
import { selectPromptPair } from "../prompts/promptSelector.js";
import { createId } from "../utils/id.js";
import type { PlayerState, RoundState } from "../types/game.js";

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function chooseIds(players: PlayerState[], count: number, avoidIds: string[] = []): string[] {
  const preferred = players.filter((player) => !avoidIds.includes(player.id));
  const pool = preferred.length >= count ? preferred : players;
  return shuffled(pool)
    .slice(0, count)
    .map((player) => player.id);
}

export function chooseCaseCriminals(players: PlayerState[], count: number): string[] {
  return chooseIds(players, count);
}

export function createRound({
  settings,
  players,
  prompts,
  usedPromptPairIds,
  roundNumber,
  lastOffPromptPlayerIds,
  criminalPlayerIds,
}: {
  settings: GameSettings;
  players: PlayerState[];
  prompts: PromptPair[];
  usedPromptPairIds: Iterable<string>;
  roundNumber: number;
  lastOffPromptPlayerIds: string[];
  criminalPlayerIds: string[];
}): RoundState {
  const activePlayers = players.filter((player) => !player.isEliminated);
  const promptPair = selectPromptPair({
    prompts,
    mode: settings.mode,
    activePlayerCount: activePlayers.length,
    usedPromptPairIds,
    safeLevel: settings.safeLevel,
    vibe: settings.vibe,
  });
  const renderedPrompt = renderPromptPair(promptPair, activePlayers);
  const participantIds = activePlayers.map((player) => player.id);
  const offPromptPlayerIds =
    settings.mode === "case"
      ? [...criminalPlayerIds]
      : chooseIds(activePlayers, settings.offPromptCount, lastOffPromptPlayerIds);

  const promptByPlayerId = Object.fromEntries(
    activePlayers.map((player) => [
      player.id,
      offPromptPlayerIds.includes(player.id) ? renderedPrompt.offPrompt : renderedPrompt.mainPrompt,
    ])
  );

  return {
    id: createId("round"),
    number: roundNumber,
    status: "answering",
    promptPairId: promptPair.id,
    category: promptPair.category,
    mainPrompt: renderedPrompt.mainPrompt,
    answerFormat: promptPair.answerFormat,
    targetPlayerId: renderedPrompt.targetPlayerId,
    participantIds,
    offPromptPlayerIds,
    criminalPlayerIds,
    promptByPlayerId,
    answers: {},
    votes: {},
    startedAt: Date.now(),
    revealedAt: null,
    votingStartedAt: null,
    result: null,
  };
}
