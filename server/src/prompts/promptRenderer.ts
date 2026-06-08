import type {
  PromptPair,
  RenderablePlayer,
  RenderedPromptPair,
} from "./promptTypes.js";

function activePlayers(players: RenderablePlayer[]): RenderablePlayer[] {
  return players.filter((player) => !player.isEliminated);
}

function randomPlayer(players: RenderablePlayer[]): RenderablePlayer {
  if (players.length === 0) {
    throw new Error("Cannot render dynamic prompt because there are no active players.");
  }
  return players[Math.floor(Math.random() * players.length)];
}

export function renderPromptPair(
  promptPair: PromptPair,
  players: RenderablePlayer[]
): RenderedPromptPair {
  let mainPrompt = promptPair.mainPrompt;
  let offPrompt = promptPair.offPrompt;
  let targetPlayerId: string | null = null;

  if (promptPair.requiresTargetPlayer) {
    if (promptPair.targetRule !== "random_active_player") {
      throw new Error(`Unsupported targetRule for prompt ${promptPair.id}.`);
    }

    const targetPlayer = randomPlayer(activePlayers(players));
    targetPlayerId = targetPlayer.id;
    mainPrompt = mainPrompt.replaceAll("{player}", targetPlayer.name);
    offPrompt = offPrompt.replaceAll("{player}", targetPlayer.name);
  }

  return {
    promptPairId: promptPair.id,
    targetPlayerId,
    mainPrompt,
    offPrompt,
  };
}
