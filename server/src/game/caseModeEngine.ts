import type { RoundResultView } from "@off-prompt/shared";
import type { PlayerState } from "../types/game.js";
import { getTopVoteInfo, type buildVoteBreakdown } from "./voting.js";

type VoteBreakdown = ReturnType<typeof buildVoteBreakdown>;

export function getCaseWinner(
  players: Map<string, PlayerState>,
  criminalPlayerIds: Set<string>
): "civilians" | "criminals" | null {
  const activePlayers = Array.from(players.values()).filter((player) => !player.isEliminated);
  const activeCriminals = activePlayers.filter((player) => criminalPlayerIds.has(player.id)).length;
  const activeCivilians = activePlayers.length - activeCriminals;

  if (activeCriminals === 0) {
    return "civilians";
  }
  if (activeCriminals >= activeCivilians) {
    return "criminals";
  }
  return null;
}

export function applyCaseVote({
  players,
  criminalPlayerIds,
  offPromptPlayerIds,
  voteBreakdown,
  roundNumber,
}: {
  players: Map<string, PlayerState>;
  criminalPlayerIds: Set<string>;
  offPromptPlayerIds: string[];
  voteBreakdown: VoteBreakdown;
  roundNumber: number;
}): RoundResultView {
  const topInfo = getTopVoteInfo(voteBreakdown);
  let eliminatedPlayerId: string | null = null;
  let outcome: RoundResultView["outcome"] = "caseNoVotes";
  let outcomeText = "No votes were cast. Nobody is eliminated.";

  if (topInfo.totalVotes > 0 && topInfo.isTie) {
    outcome = "caseTie";
    outcomeText = "The vote is tied. Nobody is eliminated.";
  }

  if (topInfo.totalVotes > 0 && !topInfo.isTie) {
    eliminatedPlayerId = topInfo.topPlayerIds[0] ?? null;
    const eliminatedPlayer = eliminatedPlayerId ? players.get(eliminatedPlayerId) : null;
    if (eliminatedPlayer) {
      eliminatedPlayer.isEliminated = true;
      eliminatedPlayer.isReady = false;
      outcome = "caseEliminated";
      outcomeText = `${eliminatedPlayer.name} has been eliminated.`;
    }
  }

  const winner = getCaseWinner(players, criminalPlayerIds);
  if (winner === "civilians") {
    outcome = "civiliansWin";
    outcomeText = "Civilians cracked the case. All criminals are out.";
  }
  if (winner === "criminals") {
    outcome = "criminalsWin";
    outcomeText = "Criminals control the room. The case is closed.";
  }

  return {
    roundNumber,
    outcome,
    outcomeText,
    offPromptPlayerIds,
    criminalPlayerIds: Array.from(criminalPlayerIds),
    eliminatedPlayerId,
    winningTeam: winner,
    voteBreakdown,
    tiedPlayerIds: topInfo.isTie ? topInfo.topPlayerIds : [],
  };
}
