import type { RoundResultView } from "@off-prompt/shared";
import type { PlayerState } from "../types/game.js";
import { getTopVoteInfo, type buildVoteBreakdown } from "./voting.js";

type VoteBreakdown = ReturnType<typeof buildVoteBreakdown>;

export function applyPartyScoring({
  players,
  participantIds,
  offPromptPlayerIds,
  voteBreakdown,
  roundNumber,
}: {
  players: Map<string, PlayerState>;
  participantIds: string[];
  offPromptPlayerIds: string[];
  voteBreakdown: VoteBreakdown;
  roundNumber: number;
}): RoundResultView {
  const topInfo = getTopVoteInfo(voteBreakdown);
  const caughtPlayerId = topInfo.topPlayerIds[0] ?? null;
  const hasMajority = topInfo.topVoteCount > topInfo.totalVotes / 2;
  const caught =
    !topInfo.isTie && caughtPlayerId !== null && offPromptPlayerIds.includes(caughtPlayerId) && hasMajority;

  if (caught) {
    for (const playerId of participantIds) {
      if (!offPromptPlayerIds.includes(playerId)) {
        const player = players.get(playerId);
        if (player) {
          player.score += 1;
        }
      }
    }
  } else {
    for (const playerId of offPromptPlayerIds) {
      const player = players.get(playerId);
      if (player) {
        player.score += 1;
      }
    }
  }

  const offPromptNames = offPromptPlayerIds
    .map((playerId) => players.get(playerId)?.name)
    .filter((name): name is string => Boolean(name));

  return {
    roundNumber,
    outcome: caught ? "onPromptCaught" : "offPromptEscaped",
    outcomeText: caught
      ? `Caught. Everyone on prompt gets the point.`
      : `${offPromptNames.join(", ")} blended in. Off Prompt gets the point.`,
    offPromptPlayerIds,
    criminalPlayerIds: [],
    eliminatedPlayerId: null,
    winningTeam: null,
    voteBreakdown,
    tiedPlayerIds: topInfo.isTie ? topInfo.topPlayerIds : [],
  };
}
