import type {
  GameSettings,
  HostRoomState,
  PlayerRoomState,
  PublicPlayer,
  RoomStatus,
  RoundHistoryItem,
  RoundResultView,
} from "@off-prompt/shared";
import type { PromptPair } from "../prompts/promptTypes.js";
import { createRound, chooseCaseCriminals } from "./gameEngine.js";
import { applyCaseVote } from "../game/caseModeEngine.js";
import { applyPartyScoring } from "../game/scoring.js";
import { buildVoteBreakdown } from "../game/voting.js";
import type { PlayerState, RoomState, RoundState } from "../types/game.js";
import { createId, createSessionToken } from "../utils/id.js";
import { logger } from "../utils/logger.js";
import { generateRoomCode, normalizeRoomCode } from "../utils/roomCode.js";
import { minutesToMs, now } from "../utils/time.js";
import { normalizeAnswer, sanitizeName, validateSettings } from "../utils/validation.js";

const defaultSettings: GameSettings = {
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

function toPublicPlayer(player: PlayerState): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    score: player.score,
    isReady: player.isReady,
    isConnected: player.isConnected,
    isEliminated: player.isEliminated,
  };
}

function sortedPlayers(room: RoomState): PlayerState[] {
  return Array.from(room.players.values()).sort((a, b) => a.joinedAt - b.joinedAt);
}

function activePlayers(room: RoomState): PlayerState[] {
  return sortedPlayers(room).filter((player) => !player.isEliminated);
}

function requiredAnswerIds(round: RoundState): string[] {
  return round.participantIds;
}

function connectedMissingAnswerIds(room: RoomState, round: RoundState): string[] {
  return requiredAnswerIds(round).filter((playerId) => {
    const player = room.players.get(playerId);
    return Boolean(player?.isConnected) && round.answers[playerId] === undefined;
  });
}

function disconnectedMissingAnswerIds(room: RoomState, round: RoundState): string[] {
  return requiredAnswerIds(round).filter((playerId) => {
    const player = room.players.get(playerId);
    return !player?.isConnected && round.answers[playerId] === undefined;
  });
}

function eligibleVoterIds(room: RoomState, round: RoundState): string[] {
  return round.participantIds.filter((playerId) => {
    const player = room.players.get(playerId);
    return Boolean(player && !player.isEliminated);
  });
}

function eligibleTargetIds(room: RoomState, round: RoundState): string[] {
  return round.participantIds.filter((playerId) => {
    const player = room.players.get(playerId);
    return Boolean(player && !player.isEliminated);
  });
}

function isFinalPartyRound(room: RoomState): boolean {
  return room.settings.mode === "party" && (room.currentRound?.number ?? 0) >= room.settings.rounds;
}

function historyFromResult(room: RoomState, result: RoundResultView): RoundHistoryItem {
  return {
    roundNumber: result.roundNumber,
    category: room.currentRound?.category ?? "Mixed",
    outcomeText: result.outcomeText,
    offPromptNames: result.offPromptPlayerIds
      .map((playerId) => room.players.get(playerId)?.name)
      .filter((name): name is string => Boolean(name)),
    eliminatedName: result.eliminatedPlayerId
      ? room.players.get(result.eliminatedPlayerId)?.name ?? null
      : null,
  };
}

export class RoomManager {
  private readonly rooms = new Map<string, RoomState>();

  constructor(
    private readonly prompts: PromptPair[],
    private readonly roomTtlMs: number
  ) {}

  static defaultSettings(): GameSettings {
    return { ...defaultSettings };
  }

  getRoom(roomCode: string): RoomState | null {
    return this.rooms.get(normalizeRoomCode(roomCode)) ?? null;
  }

  createRoom({
    socketId,
    hostSessionToken,
    settings,
  }: {
    socketId: string;
    hostSessionToken?: string;
    settings: GameSettings;
  }): HostRoomState {
    const normalizedSettings = validateSettings(settings);
    let roomCode = generateRoomCode();
    while (this.rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const timestamp = now();
    const room: RoomState = {
      roomCode,
      hostSessionToken: hostSessionToken && hostSessionToken.length >= 20 ? hostSessionToken : createSessionToken(),
      hostSocketId: socketId,
      hostConnected: true,
      settings: normalizedSettings,
      status: "lobby",
      players: new Map(),
      usedPromptPairIds: new Set(),
      currentRound: null,
      roundHistory: [],
      finalResult: null,
      criminalPlayerIds: new Set(),
      lastOffPromptPlayerIds: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: timestamp + this.roomTtlMs,
    };

    this.rooms.set(roomCode, room);
    logger.info("Room created", { roomCode, mode: normalizedSettings.mode });
    return this.getHostState(roomCode);
  }

  reconnectHost(roomCode: string, hostSessionToken: string, socketId: string): HostRoomState {
    const room = this.requireRoom(roomCode);
    if (room.hostSessionToken !== hostSessionToken) {
      throw new Error("Host recovery failed. Create a new room or use the original host browser.");
    }
    room.hostSocketId = socketId;
    room.hostConnected = true;
    this.touch(room);
    return this.getHostState(room.roomCode);
  }

  updateSettings(roomCode: string, hostSessionToken: string, settings: GameSettings): HostRoomState {
    const room = this.requireHost(roomCode, hostSessionToken);
    if (room.status !== "lobby") {
      throw new Error("Settings can only be changed in the lobby.");
    }
    room.settings = validateSettings(settings);
    this.touch(room);
    return this.getHostState(room.roomCode);
  }

  closeRoom(roomCode: string, hostSessionToken: string): void {
    const room = this.requireHost(roomCode, hostSessionToken);
    this.rooms.delete(room.roomCode);
    logger.info("Room closed", { roomCode: room.roomCode });
  }

  joinPlayer({
    roomCode,
    name,
    playerSessionToken,
    socketId,
  }: {
    roomCode: string;
    name: string;
    playerSessionToken?: string;
    socketId: string;
  }): PlayerRoomState {
    const room = this.requireRoom(roomCode);
    if (room.status !== "lobby") {
      throw new Error("This game has already started.");
    }
    if (room.players.size >= room.settings.playerCount) {
      throw new Error("This room is already full.");
    }

    const safeName = sanitizeName(name);
    const duplicate = Array.from(room.players.values()).some(
      (player) => player.name.toLowerCase() === safeName.toLowerCase()
    );
    if (duplicate) {
      throw new Error("This name is already taken in this room.");
    }

    const timestamp = now();
    const player: PlayerState = {
      id: createId("player"),
      sessionToken:
        playerSessionToken && playerSessionToken.length >= 20 ? playerSessionToken : createSessionToken(),
      socketId,
      name: safeName,
      score: 0,
      isReady: false,
      isConnected: true,
      isEliminated: false,
      joinedAt: timestamp,
      lastSeenAt: timestamp,
      role: null,
    };

    room.players.set(player.id, player);
    this.touch(room);
    logger.info("Player joined", { roomCode: room.roomCode, playerId: player.id });
    return this.getPlayerState(room.roomCode, player.id);
  }

  reconnectPlayer({
    roomCode,
    playerId,
    playerSessionToken,
    socketId,
  }: {
    roomCode: string;
    playerId: string;
    playerSessionToken: string;
    socketId: string;
  }): PlayerRoomState {
    const room = this.requireRoom(roomCode);
    const player = this.requirePlayer(room, playerId);
    if (player.sessionToken !== playerSessionToken) {
      throw new Error("Player recovery failed. Join again if the room is still in lobby.");
    }
    player.socketId = socketId;
    player.isConnected = true;
    player.lastSeenAt = now();
    this.touch(room);
    return this.getPlayerState(room.roomCode, player.id);
  }

  leavePlayer(roomCode: string, playerId: string, playerSessionToken: string): void {
    const room = this.requireRoom(roomCode);
    const player = this.requirePlayer(room, playerId);
    if (player.sessionToken !== playerSessionToken) {
      throw new Error("Player recovery failed.");
    }

    if (room.status === "lobby") {
      room.players.delete(player.id);
    } else {
      player.socketId = null;
      player.isConnected = false;
      player.lastSeenAt = now();
    }
    this.touch(room);
  }

  setReady(
    roomCode: string,
    playerId: string,
    playerSessionToken: string,
    isReady: boolean
  ): PlayerRoomState {
    const room = this.requireRoom(roomCode);
    if (room.status !== "lobby") {
      throw new Error("Ready can only be changed in the lobby.");
    }
    const player = this.requirePlayer(room, playerId);
    this.requirePlayerSession(player, playerSessionToken);
    player.isReady = isReady;
    player.lastSeenAt = now();
    this.touch(room);
    return this.getPlayerState(room.roomCode, player.id);
  }

  startGame(roomCode: string, hostSessionToken: string): HostRoomState {
    const room = this.requireHost(roomCode, hostSessionToken);
    if (!this.canStart(room)) {
      throw new Error("Start unlocks when the room is full and everyone is ready.");
    }

    room.usedPromptPairIds.clear();
    room.roundHistory = [];
    room.finalResult = null;
    room.lastOffPromptPlayerIds = [];
    room.criminalPlayerIds.clear();
    for (const player of room.players.values()) {
      player.score = 0;
      player.isEliminated = false;
      player.role = null;
    }

    if (room.settings.mode === "case") {
      const criminalIds = chooseCaseCriminals(sortedPlayers(room), room.settings.criminalCount);
      for (const playerId of criminalIds) {
        room.criminalPlayerIds.add(playerId);
      }
      for (const player of room.players.values()) {
        player.role = room.criminalPlayerIds.has(player.id) ? "criminal" : "civilian";
      }
    }

    this.startNextRound(room);
    logger.info("Game started", { roomCode: room.roomCode, mode: room.settings.mode });
    return this.getHostState(room.roomCode);
  }

  submitAnswer(
    roomCode: string,
    playerId: string,
    playerSessionToken: string,
    rawAnswer: string
  ): PlayerRoomState {
    const room = this.requireRoom(roomCode);
    const player = this.requirePlayer(room, playerId);
    this.requirePlayerSession(player, playerSessionToken);
    const round = this.requireCurrentRound(room);

    if (round.status !== "answering") {
      throw new Error("Answering is closed for this round.");
    }
    if (!round.participantIds.includes(player.id)) {
      throw new Error("Spectators cannot answer this round.");
    }
    if (round.answers[player.id] !== undefined) {
      throw new Error("You already submitted an answer.");
    }

    round.answers[player.id] = normalizeAnswer(rawAnswer, round.answerFormat);
    player.lastSeenAt = now();
    this.touch(room);
    return this.getPlayerState(room.roomCode, player.id);
  }

  revealAnswers(roomCode: string, hostSessionToken: string, force = false): HostRoomState {
    const room = this.requireHost(roomCode, hostSessionToken);
    const round = this.requireCurrentRound(room);
    if (round.status !== "answering") {
      throw new Error("Answers are not being collected right now.");
    }

    const allSubmitted = requiredAnswerIds(round).every((playerId) => round.answers[playerId] !== undefined);
    const connectedMissing = connectedMissingAnswerIds(room, round);
    const disconnectedMissing = disconnectedMissingAnswerIds(room, round);
    const canForce =
      force && Object.keys(round.answers).length > 0 && connectedMissing.length === 0 && disconnectedMissing.length > 0;

    if (!allSubmitted && !canForce) {
      throw new Error("Wait for connected players to submit before revealing answers.");
    }

    round.status = "discussion";
    round.revealedAt = now();
    room.status = "discussion";
    this.touch(room);
    return this.getHostState(room.roomCode);
  }

  startVoting(roomCode: string, hostSessionToken: string): HostRoomState {
    const room = this.requireHost(roomCode, hostSessionToken);
    const round = this.requireCurrentRound(room);
    if (round.status !== "discussion") {
      throw new Error("Reveal answers before opening the vote.");
    }
    round.status = "voting";
    round.votingStartedAt = now();
    round.votes = {};
    room.status = "voting";
    this.touch(room);
    return this.getHostState(room.roomCode);
  }

  submitVote(
    roomCode: string,
    playerId: string,
    playerSessionToken: string,
    targetPlayerId: string
  ): PlayerRoomState {
    const room = this.requireRoom(roomCode);
    const player = this.requirePlayer(room, playerId);
    this.requirePlayerSession(player, playerSessionToken);
    const round = this.requireCurrentRound(room);

    if (round.status !== "voting") {
      throw new Error("Voting is not open right now.");
    }
    if (!eligibleVoterIds(room, round).includes(player.id)) {
      throw new Error("Spectators cannot vote this round.");
    }
    if (targetPlayerId === player.id) {
      throw new Error("Pick someone else. Self-voting is disabled.");
    }
    if (!eligibleTargetIds(room, round).includes(targetPlayerId)) {
      throw new Error("That player cannot be voted for.");
    }
    if (round.votes[player.id] !== undefined) {
      throw new Error("You already locked your vote.");
    }

    round.votes[player.id] = targetPlayerId;
    player.lastSeenAt = now();

    if (this.allEligibleVotersSubmitted(room, round)) {
      this.finalizeVoting(room);
    } else {
      this.touch(room);
    }

    return this.getPlayerState(room.roomCode, player.id);
  }

  endVoting(roomCode: string, hostSessionToken: string): HostRoomState {
    const room = this.requireHost(roomCode, hostSessionToken);
    const round = this.requireCurrentRound(room);
    if (round.status !== "voting") {
      throw new Error("Voting is not open right now.");
    }
    this.finalizeVoting(room);
    return this.getHostState(room.roomCode);
  }

  nextRound(roomCode: string, hostSessionToken: string): HostRoomState {
    const room = this.requireHost(roomCode, hostSessionToken);
    const round = this.requireCurrentRound(room);
    if (room.status !== "round_result" || !round.result) {
      throw new Error("The next round can start after the current result.");
    }
    if (isFinalPartyRound(room)) {
      room.finalResult = round.result;
      room.status = "game_over";
      round.status = "game_over";
      return this.getHostState(room.roomCode);
    }
    this.startNextRound(room);
    return this.getHostState(room.roomCode);
  }

  revealFinalWinner(roomCode: string, hostSessionToken: string): HostRoomState {
    const room = this.requireHost(roomCode, hostSessionToken);
    const round = this.requireCurrentRound(room);
    if (!isFinalPartyRound(room) || !round.result) {
      throw new Error("Final winner can only be revealed after the last party round result.");
    }

    room.finalResult = round.result;
    room.status = "game_over";
    round.status = "game_over";
    this.touch(room);
    return this.getHostState(room.roomCode);
  }

  restartGame(roomCode: string, hostSessionToken: string): HostRoomState {
    const room = this.requireHost(roomCode, hostSessionToken);
    const timestamp = now();
    room.status = "lobby";
    room.currentRound = null;
    room.usedPromptPairIds.clear();
    room.roundHistory = [];
    room.finalResult = null;
    room.criminalPlayerIds.clear();
    room.lastOffPromptPlayerIds = [];
    for (const player of room.players.values()) {
      player.score = 0;
      player.isReady = false;
      player.isEliminated = false;
      player.role = null;
      player.lastSeenAt = timestamp;
    }
    this.touch(room);
    return this.getHostState(room.roomCode);
  }

  disconnectSocket(socketId: string): string[] {
    const affectedRoomCodes: string[] = [];

    for (const room of this.rooms.values()) {
      let affected = false;

      if (room.hostSocketId === socketId) {
        room.hostSocketId = null;
        room.hostConnected = false;
        affected = true;
      }

      for (const player of room.players.values()) {
        if (player.socketId === socketId) {
          player.socketId = null;
          player.isConnected = false;
          player.lastSeenAt = now();
          affected = true;
        }
      }

      if (affected) {
        this.touch(room);
        affectedRoomCodes.push(room.roomCode);
      }
    }

    return affectedRoomCodes;
  }

  cleanupExpiredRooms(): string[] {
    const timestamp = now();
    const removed: string[] = [];
    for (const room of this.rooms.values()) {
      if (room.expiresAt <= timestamp) {
        this.rooms.delete(room.roomCode);
        removed.push(room.roomCode);
      }
    }
    if (removed.length > 0) {
      logger.info("Expired rooms cleaned up", { count: removed.length });
    }
    return removed;
  }

  getHostState(roomCode: string): HostRoomState {
    const room = this.requireRoom(roomCode);
    const round = room.currentRound;
    const players = sortedPlayers(room).map(toPublicPlayer);

    return {
      roomCode: room.roomCode,
      status: room.status,
      settings: room.settings,
      players,
      hostConnected: room.hostConnected,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      canStart: this.canStart(room),
      canRevealAnswers: Boolean(round && round.status === "answering" && this.allAnswersSubmitted(round)),
      canForceRevealAnswers: Boolean(
        round &&
          round.status === "answering" &&
          Object.keys(round.answers).length > 0 &&
          connectedMissingAnswerIds(room, round).length === 0 &&
          disconnectedMissingAnswerIds(room, round).length > 0
      ),
      canStartVoting: Boolean(round && round.status === "discussion"),
      canEndVoting: Boolean(round && round.status === "voting" && Object.keys(round.votes).length > 0),
      canAdvanceRound: Boolean(room.status === "round_result" && round?.result),
      currentRound: round ? this.toHostRoundView(room, round) : null,
      roundHistory: room.roundHistory,
      finalResult: room.finalResult,
    };
  }

  getPlayerState(roomCode: string, playerId: string): PlayerRoomState {
    const room = this.requireRoom(roomCode);
    const player = this.requirePlayer(room, playerId);
    const round = room.currentRound;

    return {
      roomCode: room.roomCode,
      status: room.status,
      settings: room.settings,
      player: toPublicPlayer(player),
      players: sortedPlayers(room).map(toPublicPlayer),
      isSpectator: player.isEliminated,
      roleReveal: this.getRoleReveal(room, player),
      currentRound: round
        ? {
            roundNumber: round.number,
            status: round.status,
            answerFormat: round.answerFormat,
            privatePrompt: round.participantIds.includes(player.id) ? round.promptByPlayerId[player.id] ?? null : null,
            answerSubmitted: round.answers[player.id] !== undefined,
            voteSubmitted: round.votes[player.id] !== undefined,
            eligibleVoteTargets:
              round.status === "voting"
                ? eligibleTargetIds(room, round)
                    .filter((targetId) => targetId !== player.id)
                    .map((targetId) => room.players.get(targetId))
                    .filter((target): target is PlayerState => Boolean(target))
                    .map(toPublicPlayer)
                : [],
            result: round.result,
            isParticipant: round.participantIds.includes(player.id),
          }
        : null,
      roundHistory: room.roundHistory,
      finalResult: room.finalResult,
    };
  }

  getPlayerStates(roomCode: string): PlayerRoomState[] {
    const room = this.requireRoom(roomCode);
    return sortedPlayers(room).map((player) => this.getPlayerState(room.roomCode, player.id));
  }

  private getRoleReveal(room: RoomState, player: PlayerState): PlayerRoomState["roleReveal"] {
    if (room.status === "game_over") {
      return player.role;
    }
    if (room.settings.mode === "party" && room.currentRound?.result) {
      return room.currentRound.offPromptPlayerIds.includes(player.id) ? "offPrompt" : "onPrompt";
    }
    return null;
  }

  private startNextRound(room: RoomState): void {
    const nextRoundNumber = room.currentRound ? room.currentRound.number + 1 : 1;
    const active = activePlayers(room);
    if (active.length < 3) {
      throw new Error("At least 3 active players are required.");
    }

    const round = createRound({
      settings: room.settings,
      players: active,
      prompts: this.prompts,
      usedPromptPairIds: room.usedPromptPairIds,
      roundNumber: nextRoundNumber,
      lastOffPromptPlayerIds: room.lastOffPromptPlayerIds,
      criminalPlayerIds: Array.from(room.criminalPlayerIds),
    });

    room.currentRound = round;
    room.status = "answering";
    room.usedPromptPairIds.add(round.promptPairId);
    room.lastOffPromptPlayerIds = round.offPromptPlayerIds;

    for (const player of room.players.values()) {
      if (room.settings.mode === "party") {
        player.role = round.offPromptPlayerIds.includes(player.id) ? "offPrompt" : "onPrompt";
      }
      player.isReady = false;
    }

    this.touch(room);
  }

  private finalizeVoting(room: RoomState): void {
    const round = this.requireCurrentRound(room);
    if (round.status !== "voting") {
      throw new Error("Voting is not open right now.");
    }

    if (room.settings.mode === "party") {
      const voteBreakdown = buildVoteBreakdown({
        candidateIds: eligibleTargetIds(room, round),
        votes: round.votes,
        players: room.players,
        offPromptPlayerIds: round.offPromptPlayerIds,
        criminalPlayerIds: [],
        eliminatedPlayerId: null,
      });
      round.result = applyPartyScoring({
        players: room.players,
        participantIds: round.participantIds,
        offPromptPlayerIds: round.offPromptPlayerIds,
        voteBreakdown,
        roundNumber: round.number,
      });
    } else {
      const hiddenBreakdown = buildVoteBreakdown({
        candidateIds: eligibleTargetIds(room, round),
        votes: round.votes,
        players: room.players,
        offPromptPlayerIds: [],
        criminalPlayerIds: [],
        eliminatedPlayerId: null,
      });
      const caseResult = applyCaseVote({
        players: room.players,
        criminalPlayerIds: room.criminalPlayerIds,
        offPromptPlayerIds: [],
        voteBreakdown: hiddenBreakdown,
        roundNumber: round.number,
      });

      if (caseResult.winningTeam) {
        caseResult.criminalPlayerIds = Array.from(room.criminalPlayerIds);
        caseResult.offPromptPlayerIds = Array.from(room.criminalPlayerIds);
        caseResult.voteBreakdown = buildVoteBreakdown({
          candidateIds: eligibleTargetIds(room, round),
          votes: round.votes,
          players: room.players,
          offPromptPlayerIds: Array.from(room.criminalPlayerIds),
          criminalPlayerIds: Array.from(room.criminalPlayerIds),
          eliminatedPlayerId: caseResult.eliminatedPlayerId,
        });
      } else if (caseResult.eliminatedPlayerId) {
        caseResult.voteBreakdown = buildVoteBreakdown({
          candidateIds: round.participantIds,
          votes: round.votes,
          players: room.players,
          offPromptPlayerIds: [],
          criminalPlayerIds: [],
          eliminatedPlayerId: caseResult.eliminatedPlayerId,
        });
      }

      round.result = caseResult;
    }

    round.status = round.result.winningTeam ? "game_over" : "round_result";
    room.status = round.status;
    room.roundHistory.push(historyFromResult(room, round.result));
    if (round.status === "game_over") {
      room.finalResult = round.result;
    }
    this.touch(room);
  }

  private allEligibleVotersSubmitted(room: RoomState, round: RoundState): boolean {
    const voters = eligibleVoterIds(room, round);
    return voters.length > 0 && voters.every((playerId) => round.votes[playerId] !== undefined);
  }

  private allAnswersSubmitted(round: RoundState): boolean {
    return requiredAnswerIds(round).every((playerId) => round.answers[playerId] !== undefined);
  }

  private toHostRoundView(room: RoomState, round: RoundState): HostRoomState["currentRound"] {
    const submitted = Object.keys(round.answers).length;
    const voters = eligibleVoterIds(room, round);
    const promptIsPublic =
      round.status === "discussion" ||
      round.status === "voting" ||
      round.status === "round_result" ||
      round.status === "game_over";
    const answers =
      promptIsPublic
        ? round.participantIds
            .map((playerId) => {
              const player = room.players.get(playerId);
              const answer = round.answers[playerId];
              if (!player || answer === undefined) {
                return null;
              }
              return {
                playerId,
                playerName: player.name,
                answer,
                isDisconnected: !player.isConnected,
              };
            })
            .filter((answer): answer is NonNullable<typeof answer> => answer !== null)
        : [];

    return {
      roundNumber: round.number,
      status: round.status,
      category: round.category,
      publicPrompt: promptIsPublic ? round.mainPrompt : null,
      answerFormat: round.answerFormat,
      participantCount: round.participantIds.length,
      answerProgress: {
        submitted,
        total: requiredAnswerIds(round).length,
        disconnectedMissing: disconnectedMissingAnswerIds(room, round).length,
      },
      voteProgress: {
        submitted: Object.keys(round.votes).length,
        total: voters.length,
      },
      startedAt: round.startedAt,
      revealedAt: round.revealedAt,
      votingStartedAt: round.votingStartedAt,
      answers,
      result: round.result,
    };
  }

  private canStart(room: RoomState): boolean {
    const players = sortedPlayers(room);
    return (
      room.status === "lobby" &&
      room.hostConnected &&
      players.length === room.settings.playerCount &&
      players.every((player) => player.isReady)
    );
  }

  private requireRoom(roomCode: string): RoomState {
    const normalizedCode = normalizeRoomCode(roomCode);
    const room = this.rooms.get(normalizedCode);
    if (!room) {
      throw new Error("Room not found. Check the code and try again.");
    }
    return room;
  }

  private requireHost(roomCode: string, hostSessionToken: string): RoomState {
    const room = this.requireRoom(roomCode);
    if (room.hostSessionToken !== hostSessionToken) {
      throw new Error("Only the host can do that.");
    }
    return room;
  }

  private requirePlayer(room: RoomState, playerId: string): PlayerState {
    const player = room.players.get(playerId);
    if (!player) {
      throw new Error("Player not found in this room.");
    }
    return player;
  }

  private requirePlayerSession(player: PlayerState, playerSessionToken: string): void {
    if (player.sessionToken !== playerSessionToken) {
      throw new Error("Player recovery failed.");
    }
  }

  private requireCurrentRound(room: RoomState): RoundState {
    if (!room.currentRound) {
      throw new Error("No round is active right now.");
    }
    return room.currentRound;
  }

  private touch(room: RoomState): void {
    const timestamp = now();
    room.updatedAt = timestamp;
    room.expiresAt = timestamp + this.roomTtlMs;
  }
}

export function createRoomManager(prompts: PromptPair[]): RoomManager {
  const ttlMinutes = Number.parseInt(process.env.ROOM_TTL_MINUTES ?? "180", 10);
  const ttl = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes : 180;
  return new RoomManager(prompts, minutesToMs(ttl));
}
