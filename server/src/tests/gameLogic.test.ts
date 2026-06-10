import { describe, expect, it } from "vitest";
import type { GameSettings } from "@off-prompt/shared";
import { renderPromptPair } from "../prompts/promptRenderer.js";
import { selectPromptPair } from "../prompts/promptSelector.js";
import type { PromptPair } from "../prompts/promptTypes.js";
import { RoomManager } from "../rooms/roomManager.js";
import { getCaseWinner } from "../game/caseModeEngine.js";
import { buildVoteBreakdown } from "../game/voting.js";
import { applyPartyScoring } from "../game/scoring.js";
import type { PlayerState } from "../types/game.js";
import { generateRoomCode, isValidRoomCode } from "../utils/roomCode.js";

const baseSettings: GameSettings = {
  mode: "party",
  playerCount: 3,
  offPromptCount: 1,
  criminalCount: 1,
  rounds: 3,
  safeLevel: "safe",
  vibe: "mixed",
  discussionSeconds: 90,
  votingSeconds: 60,
};

const prompt: PromptPair = {
  id: "test_001",
  category: "Test",
  type: "open",
  modeCompatibility: ["party", "case"],
  requiresTargetPlayer: false,
  targetRule: null,
  mainPrompt: "Name a blue object.",
  offPrompt: "Name a purple object.",
  answerFormat: "text",
  minPlayers: 3,
  maxPlayers: 10,
  safeLevel: "safe",
  vibe: "funny",
  tags: ["test"],
};

function player(id: string, name: string): PlayerState {
  return {
    id,
    sessionToken: `${id}_session_token_1234567890`,
    socketId: `${id}_socket`,
    name,
    score: 0,
    isReady: true,
    isConnected: true,
    isEliminated: false,
    joinedAt: Date.now(),
    lastSeenAt: Date.now(),
    role: null,
  };
}

describe("room codes", () => {
  it("generates readable valid room codes", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(5);
    expect(isValidRoomCode(code)).toBe(true);
  });
});

describe("prompt rendering", () => {
  it("renders the same target player into both variants", () => {
    const dynamicPrompt: PromptPair = {
      ...prompt,
      id: "dynamic_001",
      requiresTargetPlayer: true,
      targetRule: "random_active_player",
      mainPrompt: "How loud is {player}?",
      offPrompt: "How sneaky is {player}?",
    };

    const rendered = renderPromptPair(dynamicPrompt, [
      { id: "p1", name: "Ava" },
      { id: "p2", name: "Ben" },
    ]);

    expect(rendered.targetPlayerId).not.toBeNull();
    const targetName = rendered.targetPlayerId === "p1" ? "Ava" : "Ben";
    expect(rendered.mainPrompt).toContain(targetName);
    expect(rendered.offPrompt).toContain(targetName);
    expect(rendered.mainPrompt).not.toContain("{player}");
  });
});

describe("prompt selection", () => {
  it("can filter eligible prompts by vibe", () => {
    const roastPrompt: PromptPair = {
      ...prompt,
      id: "test_roast_001",
      vibe: "roast",
      mainPrompt: "Name something everyone pretends to understand.",
      offPrompt: "Name something people explain with total fake confidence.",
    };

    const selected = selectPromptPair({
      prompts: [prompt, roastPrompt],
      mode: "party",
      activePlayerCount: 3,
      safeLevel: "safe",
      vibe: "roast",
    });

    expect(selected.id).toBe(roastPrompt.id);
  });
});

describe("party scoring", () => {
  it("gives Off Prompt the point on a tie", () => {
    const players = new Map([
      ["p1", player("p1", "Ava")],
      ["p2", player("p2", "Ben")],
      ["p3", player("p3", "Cal")],
    ]);
    const voteBreakdown = buildVoteBreakdown({
      candidateIds: ["p1", "p2", "p3"],
      votes: { p1: "p3", p2: "p1" },
      players,
      offPromptPlayerIds: ["p3"],
      criminalPlayerIds: [],
      eliminatedPlayerId: null,
    });

    const result = applyPartyScoring({
      players,
      participantIds: ["p1", "p2", "p3"],
      offPromptPlayerIds: ["p3"],
      voteBreakdown,
      roundNumber: 1,
    });

    expect(result.outcome).toBe("offPromptEscaped");
    expect(players.get("p3")?.score).toBe(1);
    expect(players.get("p1")?.score).toBe(0);
  });

  it("requires a majority to catch Off Prompt", () => {
    const players = new Map([
      ["p1", player("p1", "Ava")],
      ["p2", player("p2", "Ben")],
      ["p3", player("p3", "Cal")],
      ["p4", player("p4", "Dee")],
    ]);
    const voteBreakdown = buildVoteBreakdown({
      candidateIds: ["p1", "p2", "p3", "p4"],
      votes: { p1: "p4", p2: "p4", p3: "p1", p4: "p2" },
      players,
      offPromptPlayerIds: ["p4"],
      criminalPlayerIds: [],
      eliminatedPlayerId: null,
    });

    const result = applyPartyScoring({
      players,
      participantIds: ["p1", "p2", "p3", "p4"],
      offPromptPlayerIds: ["p4"],
      voteBreakdown,
      roundNumber: 1,
    });

    expect(result.outcome).toBe("offPromptEscaped");
    expect(players.get("p4")?.score).toBe(1);
  });
});

describe("case mode", () => {
  it("detects civilian and criminal win conditions", () => {
    const players = new Map([
      ["p1", player("p1", "Ava")],
      ["p2", player("p2", "Ben")],
      ["p3", player("p3", "Cal")],
      ["p4", player("p4", "Dee")],
    ]);
    const criminals = new Set(["p4"]);

    expect(getCaseWinner(players, criminals)).toBeNull();
    players.get("p4")!.isEliminated = true;
    expect(getCaseWinner(players, criminals)).toBe("civilians");

    players.get("p4")!.isEliminated = false;
    players.get("p1")!.isEliminated = true;
    players.get("p2")!.isEliminated = true;
    expect(getCaseWinner(players, criminals)).toBe("criminals");
  });
});

describe("room manager prompt privacy", () => {
  it("sends each player only their private prompt and never sends prompts to host", () => {
    const manager = new RoomManager([prompt], 60_000);
    const host = manager.createRoom({
      socketId: "host_socket",
      hostSessionToken: "host_session_token_1234567890",
      settings: baseSettings,
    });

    const p1Token = "player_one_session_token_1234567890";
    const p2Token = "player_two_session_token_1234567890";
    const p3Token = "player_three_session_token_1234567890";
    const p1 = manager.joinPlayer({ roomCode: host.roomCode, name: "Ava", playerSessionToken: p1Token, socketId: "s1" });
    const p2 = manager.joinPlayer({ roomCode: host.roomCode, name: "Ben", playerSessionToken: p2Token, socketId: "s2" });
    const p3 = manager.joinPlayer({ roomCode: host.roomCode, name: "Cal", playerSessionToken: p3Token, socketId: "s3" });

    manager.setReady(host.roomCode, p1.player.id, p1Token, true);
    manager.setReady(host.roomCode, p2.player.id, p2Token, true);
    manager.setReady(host.roomCode, p3.player.id, p3Token, true);
    const hostState = manager.startGame(host.roomCode, "host_session_token_1234567890");

    expect(hostState.currentRound?.answers).toEqual([]);
    expect(hostState.currentRound?.publicPrompt).toBeNull();
    expect(JSON.stringify(hostState)).not.toContain(prompt.mainPrompt);
    expect(JSON.stringify(hostState)).not.toContain(prompt.offPrompt);

    const privatePrompts = [p1, p2, p3].map((joined) =>
      manager.getPlayerState(host.roomCode, joined.player.id).currentRound?.privatePrompt
    );
    expect(privatePrompts.every((privatePrompt) => privatePrompt === prompt.mainPrompt || privatePrompt === prompt.offPrompt)).toBe(
      true
    );

    manager.submitAnswer(host.roomCode, p1.player.id, p1Token, "Blue chair");
    manager.submitAnswer(host.roomCode, p2.player.id, p2Token, "Blue cup");
    manager.submitAnswer(host.roomCode, p3.player.id, p3Token, "Purple lamp");
    const revealed = manager.revealAnswers(host.roomCode, "host_session_token_1234567890");

    expect(revealed.currentRound?.publicPrompt).toBe(prompt.mainPrompt);
    expect(revealed.currentRound?.offPrompt).toBeNull();
    expect(revealed.currentRound?.answeredPlayerIds.sort()).toEqual([p1.player.id, p2.player.id, p3.player.id].sort());
    expect(JSON.stringify(revealed)).toContain(prompt.mainPrompt);
    expect(JSON.stringify(revealed)).not.toContain(prompt.offPrompt);

    manager.startVoting(host.roomCode, "host_session_token_1234567890");
    manager.submitVote(host.roomCode, p1.player.id, p1Token, p2.player.id);
    manager.submitVote(host.roomCode, p2.player.id, p2Token, p3.player.id);
    const result = manager.submitVote(host.roomCode, p3.player.id, p3Token, p2.player.id);

    expect(result.status).toBe("round_result");
    const resultHostState = manager.getHostState(host.roomCode);
    expect(resultHostState.currentRound?.publicPrompt).toBe(prompt.mainPrompt);
    expect(resultHostState.currentRound?.offPrompt).toBe(prompt.offPrompt);
    expect(resultHostState.currentRound?.votedPlayerIds.sort()).toEqual([p1.player.id, p2.player.id, p3.player.id].sort());
    expect(JSON.stringify(resultHostState)).toContain(prompt.offPrompt);
  });
});

describe("voting disconnect behavior", () => {
  it("does not auto-end voting when disconnected eligible players have not voted", () => {
    const manager = new RoomManager([prompt], 60_000);
    const hostToken = "host_vote_smoke_token_1234567890";
    const host = manager.createRoom({
      socketId: "host_socket",
      hostSessionToken: hostToken,
      settings: baseSettings,
    });

    const playerTokens = [
      "player_vote_one_token_1234567890",
      "player_vote_two_token_1234567890",
      "player_vote_three_token_1234567890",
    ];
    const players = ["Ava", "Ben", "Cal"].map((name, index) =>
      manager.joinPlayer({
        roomCode: host.roomCode,
        name,
        playerSessionToken: playerTokens[index],
        socketId: `vote_socket_${index}`,
      })
    );

    for (const [index, joined] of players.entries()) {
      manager.setReady(host.roomCode, joined.player.id, playerTokens[index], true);
    }

    manager.startGame(host.roomCode, hostToken);

    for (const [index, joined] of players.entries()) {
      manager.submitAnswer(host.roomCode, joined.player.id, playerTokens[index], `${joined.player.name} answer`);
    }

    manager.revealAnswers(host.roomCode, hostToken);
    manager.startVoting(host.roomCode, hostToken);
    manager.disconnectSocket("vote_socket_1");
    manager.disconnectSocket("vote_socket_2");

    const afterOneVote = manager.submitVote(
      host.roomCode,
      players[0].player.id,
      playerTokens[0],
      players[1].player.id
    );
    const hostState = manager.getHostState(host.roomCode);

    expect(afterOneVote.status).toBe("voting");
    expect(hostState.status).toBe("voting");
    expect(hostState.currentRound?.voteProgress).toEqual({ submitted: 1, total: 3 });
    expect(hostState.canEndVoting).toBe(true);

    const ended = manager.endVoting(host.roomCode, hostToken);
    expect(ended.status).toBe("round_result");
    expect(ended.currentRound?.result).not.toBeNull();
  });

  it("rejoins a player into the current voting or result phase", () => {
    const manager = new RoomManager([prompt], 60_000);
    const hostToken = "host_rejoin_smoke_token_1234567890";
    const host = manager.createRoom({
      socketId: "host_socket",
      hostSessionToken: hostToken,
      settings: baseSettings,
    });

    const playerTokens = [
      "player_rejoin_one_token_1234567890",
      "player_rejoin_two_token_1234567890",
      "player_rejoin_three_token_1234567890",
    ];
    const players = ["Ava", "Ben", "Cal"].map((name, index) =>
      manager.joinPlayer({
        roomCode: host.roomCode,
        name,
        playerSessionToken: playerTokens[index],
        socketId: `rejoin_socket_${index}`,
      })
    );

    for (const [index, joined] of players.entries()) {
      manager.setReady(host.roomCode, joined.player.id, playerTokens[index], true);
    }

    manager.startGame(host.roomCode, hostToken);
    for (const [index, joined] of players.entries()) {
      manager.submitAnswer(host.roomCode, joined.player.id, playerTokens[index], `${joined.player.name} answer`);
    }
    manager.revealAnswers(host.roomCode, hostToken);
    manager.startVoting(host.roomCode, hostToken);

    manager.disconnectSocket("rejoin_socket_1");
    const votingRejoin = manager.reconnectPlayer({
      roomCode: host.roomCode,
      playerId: players[1].player.id,
      playerSessionToken: playerTokens[1],
      socketId: "rejoin_socket_1b",
    });
    expect(votingRejoin.status).toBe("voting");
    expect(votingRejoin.currentRound?.eligibleVoteTargets.length).toBeGreaterThan(0);

    manager.submitVote(host.roomCode, players[0].player.id, playerTokens[0], players[1].player.id);
    manager.submitVote(host.roomCode, players[1].player.id, playerTokens[1], players[2].player.id);
    const resultState = manager.submitVote(host.roomCode, players[2].player.id, playerTokens[2], players[1].player.id);
    expect(resultState.status).toBe("round_result");

    manager.disconnectSocket("rejoin_socket_1b");
    const resultRejoin = manager.reconnectPlayer({
      roomCode: host.roomCode,
      playerId: players[1].player.id,
      playerSessionToken: playerTokens[1],
      socketId: "rejoin_socket_1c",
    });
    expect(resultRejoin.status).toBe("round_result");
    expect(resultRejoin.currentRound?.result).not.toBeNull();
  });

  it("shows the final party round result before revealing the overall winner", () => {
    const manager = new RoomManager([prompt], 60_000);
    const hostToken = "host_final_smoke_token_1234567890";
    const host = manager.createRoom({
      socketId: "host_socket",
      hostSessionToken: hostToken,
      settings: baseSettings,
    });

    const playerTokens = [
      "player_final_one_token_1234567890",
      "player_final_two_token_1234567890",
      "player_final_three_token_1234567890",
    ];
    const players = ["Ava", "Ben", "Cal"].map((name, index) =>
      manager.joinPlayer({
        roomCode: host.roomCode,
        name,
        playerSessionToken: playerTokens[index],
        socketId: `final_socket_${index}`,
      })
    );

    for (const [index, joined] of players.entries()) {
      manager.setReady(host.roomCode, joined.player.id, playerTokens[index], true);
    }

    manager.startGame(host.roomCode, hostToken);
    const room = manager.getRoom(host.roomCode);
    expect(room?.currentRound).not.toBeNull();
    room!.currentRound!.number = baseSettings.rounds;

    for (const [index, joined] of players.entries()) {
      manager.submitAnswer(host.roomCode, joined.player.id, playerTokens[index], `${joined.player.name} answer`);
    }
    manager.revealAnswers(host.roomCode, hostToken);
    manager.startVoting(host.roomCode, hostToken);
    manager.submitVote(host.roomCode, players[0].player.id, playerTokens[0], players[1].player.id);
    manager.submitVote(host.roomCode, players[1].player.id, playerTokens[1], players[2].player.id);
    manager.submitVote(host.roomCode, players[2].player.id, playerTokens[2], players[1].player.id);

    const finalRoundResult = manager.getHostState(host.roomCode);
    expect(finalRoundResult.status).toBe("round_result");
    expect(finalRoundResult.currentRound?.result).not.toBeNull();
    expect(finalRoundResult.finalResult).toBeNull();

    const finalWinner = manager.revealFinalWinner(host.roomCode, hostToken);
    expect(finalWinner.status).toBe("game_over");
    expect(finalWinner.finalResult).not.toBeNull();
  });
});
