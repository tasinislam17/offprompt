import type { VoteBreakdownItem } from "@off-prompt/shared";
import type { PlayerState } from "../types/game.js";

export type TopVoteInfo = {
  topPlayerIds: string[];
  topVoteCount: number;
  totalVotes: number;
  isTie: boolean;
};

export function buildVoteBreakdown({
  candidateIds,
  votes,
  players,
  offPromptPlayerIds,
  criminalPlayerIds,
  eliminatedPlayerId,
}: {
  candidateIds: string[];
  votes: Record<string, string>;
  players: Map<string, PlayerState>;
  offPromptPlayerIds: string[];
  criminalPlayerIds: string[];
  eliminatedPlayerId: string | null;
}): VoteBreakdownItem[] {
  const voterNamesByTarget = new Map<string, string[]>();

  for (const [voterId, targetId] of Object.entries(votes)) {
    const voter = players.get(voterId);
    if (!voter) {
      continue;
    }
    const voterNames = voterNamesByTarget.get(targetId) ?? [];
    voterNames.push(voter.name);
    voterNamesByTarget.set(targetId, voterNames);
  }

  return candidateIds
    .map((candidateId) => {
      const player = players.get(candidateId);
      if (!player) {
        return null;
      }
      const voterNames = voterNamesByTarget.get(candidateId) ?? [];
      return {
        playerId: candidateId,
        playerName: player.name,
        voteCount: voterNames.length,
        voterNames,
        isOffPrompt: offPromptPlayerIds.includes(candidateId),
        isCriminal: criminalPlayerIds.includes(candidateId),
        wasEliminated: eliminatedPlayerId === candidateId,
      } satisfies VoteBreakdownItem;
    })
    .filter((item): item is VoteBreakdownItem => item !== null)
    .sort((a, b) => b.voteCount - a.voteCount || a.playerName.localeCompare(b.playerName));
}

export function getTopVoteInfo(breakdown: VoteBreakdownItem[]): TopVoteInfo {
  const totalVotes = breakdown.reduce((sum, item) => sum + item.voteCount, 0);
  const topVoteCount = breakdown[0]?.voteCount ?? 0;
  const topPlayerIds = breakdown
    .filter((item) => item.voteCount === topVoteCount && topVoteCount > 0)
    .map((item) => item.playerId);

  return {
    topPlayerIds,
    topVoteCount,
    totalVotes,
    isTie: topPlayerIds.length > 1,
  };
}
