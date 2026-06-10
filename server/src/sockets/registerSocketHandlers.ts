import type { Server, Socket } from "socket.io";
import { z } from "zod";
import type { ApiAck, GameSettings } from "@off-prompt/shared";
import { socketEvents, roomChannel } from "../socket/socketEvents.js";
import type { RoomManager } from "../rooms/roomManager.js";
import { RoomManager as RoomManagerClass } from "../rooms/roomManager.js";
import { createSessionToken } from "../utils/id.js";
import { logger } from "../utils/logger.js";
import { normalizeRoomCode } from "../utils/roomCode.js";

type Ack<T = unknown> = (response: ApiAck<T>) => void;

const settingsSchema = z.object({
  mode: z.enum(["party", "case"]),
  playerCount: z.number().int().min(3).max(10),
  offPromptCount: z.number().int().min(1).max(3),
  criminalCount: z.number().int().min(1).max(2),
  rounds: z.number().int().min(3).max(10),
  safeLevel: z.enum(["safe", "spicy", "adult"]),
  vibe: z.enum(["mixed", "funny", "awkward", "chaotic", "roast", "flirty", "suspicious"]),
  discussionSeconds: z.number().int().min(0).max(240),
  votingSeconds: z.number().int().min(30).max(180),
}) satisfies z.ZodType<GameSettings>;

const hostCreateRoomSchema = z.object({
  hostSessionToken: z.string().min(20).optional(),
  settings: settingsSchema,
});

const hostRoomSchema = z.object({
  roomCode: z.string().min(4),
  hostSessionToken: z.string().min(20),
});

const hostUpdateSettingsSchema = hostRoomSchema.extend({
  settings: settingsSchema,
});

const hostRevealAnswersSchema = hostRoomSchema.extend({
  force: z.boolean().optional(),
});

const playerJoinRoomSchema = z.object({
  roomCode: z.string().min(4),
  name: z.string().min(1).max(40),
  playerSessionToken: z.string().min(20).optional(),
});

const playerRoomSchema = z.object({
  roomCode: z.string().min(4),
  playerId: z.string().min(4),
  playerSessionToken: z.string().min(20),
});

const playerReadySchema = playerRoomSchema.extend({
  isReady: z.boolean(),
});

const playerAnswerSchema = playerRoomSchema.extend({
  answer: z.string().max(160),
});

const playerVoteSchema = playerRoomSchema.extend({
  targetPlayerId: z.string().min(4),
});

function ack<T>(callback: Ack<T> | undefined, response: ApiAck<T>): void {
  if (typeof callback === "function") {
    callback(response);
  }
}

function roomCodeFromPayload(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("roomCode" in payload)) {
    return null;
  }
  const roomCode = (payload as { roomCode?: unknown }).roomCode;
  return typeof roomCode === "string" ? normalizeRoomCode(roomCode) : null;
}

function sendError<T>(socket: Socket, callback: Ack<T> | undefined, message: string): void {
  ack(callback, { ok: false, error: message });
  socket.emit(socketEvents.serverError, { message });
}

function emitRoomUpdates(io: Server, manager: RoomManager, roomCode: string): void {
  const room = manager.getRoom(roomCode);
  if (!room) {
    return;
  }

  const hostState = manager.getHostState(room.roomCode);
  if (room.hostSocketId) {
    io.to(room.hostSocketId).emit(socketEvents.hostState, hostState);
  }

  for (const player of room.players.values()) {
    if (player.socketId) {
      io.to(player.socketId).emit(socketEvents.playerState, manager.getPlayerState(room.roomCode, player.id));
    }
  }

  io.to(roomChannel(room.roomCode)).emit(socketEvents.roomLobbyUpdated, {
    roomCode: room.roomCode,
    status: room.status,
    players: hostState.players,
    settings: hostState.settings,
  });

  const round = hostState.currentRound;
  if (round?.status === "answering") {
    io.to(roomChannel(room.roomCode)).emit(socketEvents.roundAnswerProgress, round.answerProgress);
  }
  if (round?.status === "discussion") {
    io.to(roomChannel(room.roomCode)).emit(socketEvents.roundAnswersRevealed);
  }
  if (round?.status === "voting") {
    io.to(roomChannel(room.roomCode)).emit(socketEvents.voteProgress, round.voteProgress);
  }
  if (round?.result) {
    io.to(roomChannel(room.roomCode)).emit(socketEvents.voteResults, round.result);
    io.to(roomChannel(room.roomCode)).emit(socketEvents.scoreboardUpdated, hostState.players);
  }
  if (hostState.status === "game_over") {
    io.to(roomChannel(room.roomCode)).emit(socketEvents.gameEnded, hostState.finalResult);
  }
}

function handle<T>(
  socket: Socket,
  manager: RoomManager,
  io: Server,
  payload: unknown,
  callback: Ack<T> | undefined,
  action: () => T
): void {
  try {
    const data = action();
    ack(callback, { ok: true, data });
    const roomCode = roomCodeFromPayload(payload);
    if (roomCode) {
      emitRoomUpdates(io, manager, roomCode);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    logger.warn("Socket action failed", { socketId: socket.id, message });
    sendError(socket, callback, message);
  }
}

export function registerSocketHandlers(io: Server, manager: RoomManager): void {
  io.on("connection", (socket) => {
    logger.debug("Socket connected", { socketId: socket.id });

    socket.on(socketEvents.hostCreateRoom, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = hostCreateRoomSchema.parse(rawPayload);
        const state = manager.createRoom({
          socketId: socket.id,
          hostSessionToken: payload.hostSessionToken ?? createSessionToken(),
          settings: payload.settings,
        });
        socket.join(roomChannel(state.roomCode));
        const room = manager.getRoom(state.roomCode);
        const response = {
          roomCode: state.roomCode,
          hostSessionToken: room?.hostSessionToken ?? payload.hostSessionToken ?? "",
          state,
        };
        socket.emit(socketEvents.roomCreated, response);
        emitRoomUpdates(io, manager, state.roomCode);
        return response;
      });
    });

    socket.on(socketEvents.hostRejoin, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = hostRoomSchema.parse(rawPayload);
        const state = manager.reconnectHost(payload.roomCode, payload.hostSessionToken, socket.id);
        socket.join(roomChannel(state.roomCode));
        return state;
      });
    });

    socket.on(socketEvents.hostUpdateSettings, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = hostUpdateSettingsSchema.parse(rawPayload);
        return manager.updateSettings(payload.roomCode, payload.hostSessionToken, payload.settings);
      });
    });

    socket.on(socketEvents.hostStartGame, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = hostRoomSchema.parse(rawPayload);
        const state = manager.startGame(payload.roomCode, payload.hostSessionToken);
        socket.emit(socketEvents.gameStarted, state);
        return state;
      });
    });

    socket.on(socketEvents.hostRevealAnswers, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = hostRevealAnswersSchema.parse(rawPayload);
        return manager.revealAnswers(payload.roomCode, payload.hostSessionToken, payload.force ?? false);
      });
    });

    socket.on(socketEvents.hostStartVoting, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = hostRoomSchema.parse(rawPayload);
        const state = manager.startVoting(payload.roomCode, payload.hostSessionToken);
        socket.emit(socketEvents.voteStarted, state);
        return state;
      });
    });

    socket.on(socketEvents.hostEndVoting, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = hostRoomSchema.parse(rawPayload);
        return manager.endVoting(payload.roomCode, payload.hostSessionToken);
      });
    });

    socket.on(socketEvents.hostNextRound, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = hostRoomSchema.parse(rawPayload);
        return manager.nextRound(payload.roomCode, payload.hostSessionToken);
      });
    });

    socket.on(socketEvents.hostRestartGame, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = hostRoomSchema.parse(rawPayload);
        return manager.restartGame(payload.roomCode, payload.hostSessionToken);
      });
    });

    socket.on(socketEvents.hostCloseRoom, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = hostRoomSchema.parse(rawPayload);
        manager.closeRoom(payload.roomCode, payload.hostSessionToken);
        return { roomCode: normalizeRoomCode(payload.roomCode) };
      });
    });

    socket.on(socketEvents.playerJoinRoom, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = playerJoinRoomSchema.parse(rawPayload);
        const state = manager.joinPlayer({
          roomCode: payload.roomCode,
          name: payload.name,
          playerSessionToken: payload.playerSessionToken ?? createSessionToken(),
          socketId: socket.id,
        });
        socket.join(roomChannel(state.roomCode));
        const response = {
          roomCode: state.roomCode,
          playerId: state.player.id,
          playerSessionToken:
            manager.getRoom(state.roomCode)?.players.get(state.player.id)?.sessionToken ?? payload.playerSessionToken ?? "",
          state,
        };
        return response;
      });
    });

    socket.on(socketEvents.playerRejoin, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = playerRoomSchema.parse(rawPayload);
        const state = manager.reconnectPlayer({
          roomCode: payload.roomCode,
          playerId: payload.playerId,
          playerSessionToken: payload.playerSessionToken,
          socketId: socket.id,
        });
        socket.join(roomChannel(state.roomCode));
        return state;
      });
    });

    socket.on(socketEvents.playerSetReady, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = playerReadySchema.parse(rawPayload);
        return manager.setReady(
          payload.roomCode,
          payload.playerId,
          payload.playerSessionToken,
          payload.isReady
        );
      });
    });

    socket.on(socketEvents.playerSubmitAnswer, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = playerAnswerSchema.parse(rawPayload);
        return manager.submitAnswer(
          payload.roomCode,
          payload.playerId,
          payload.playerSessionToken,
          payload.answer
        );
      });
    });

    socket.on(socketEvents.playerSubmitVote, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = playerVoteSchema.parse(rawPayload);
        return manager.submitVote(
          payload.roomCode,
          payload.playerId,
          payload.playerSessionToken,
          payload.targetPlayerId
        );
      });
    });

    socket.on(socketEvents.playerLeaveRoom, (rawPayload: unknown, callback?: Ack) => {
      handle(socket, manager, io, rawPayload, callback, () => {
        const payload = playerRoomSchema.parse(rawPayload);
        manager.leavePlayer(payload.roomCode, payload.playerId, payload.playerSessionToken);
        socket.leave(roomChannel(normalizeRoomCode(payload.roomCode)));
        return { roomCode: normalizeRoomCode(payload.roomCode) };
      });
    });

    socket.on("disconnect", () => {
      const affectedRooms = manager.disconnectSocket(socket.id);
      for (const roomCode of affectedRooms) {
        emitRoomUpdates(io, manager, roomCode);
      }
    });
  });
}

export const initialSettings = RoomManagerClass.defaultSettings();
