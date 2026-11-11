import promptPairs from "../data/promptPairs.json";
import { registerSocketHandlers } from "../sockets/registerSocketHandlers.js";
import { RoomManager } from "../rooms/roomManager.js";
import type { PromptPair } from "../prompts/promptTypes.js";

interface Env {
  GAME: DurableObjectNamespace;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

type Listener = (payload?: unknown, ack?: (response: unknown) => void) => void;
type WireMessage = { event: string; payload?: unknown; id?: number; ack?: unknown };

class WorkerSocket {
  readonly id: string;
  private readonly listeners = new Map<string, Listener[]>();
  private readonly channels = new Set<string>();

  constructor(private readonly socket: WebSocket, private readonly server: WorkerSocketServer, id: string = crypto.randomUUID()) {
    this.id = id;
  }

  on(event: string, listener: Listener): void {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  emit(event: string, payload?: unknown): void {
    this.send({ event, payload });
  }

  join(channel: string): void { this.channels.add(channel); }
  leave(channel: string): void { this.channels.delete(channel); }
  hasChannel(channel: string): boolean { return this.channels.has(channel); }
  wraps(socket: WebSocket): boolean { return this.socket === socket; }
  send(message: WireMessage): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  receive(message: WireMessage): void {
    const callback = typeof message.id === "number"
      ? (response: unknown) => this.send({ event: "__ack", id: message.id, ack: response })
      : undefined;
    for (const listener of this.listeners.get(message.event) ?? []) listener(message.payload, callback);
  }

  disconnect(): void {
    for (const listener of this.listeners.get("disconnect") ?? []) listener("client disconnect");
    this.server.remove(this);
  }
}

class WorkerSocketServer {
  private readonly sockets = new Map<string, WorkerSocket>();
  private connectionListener: ((socket: WorkerSocket) => void) | null = null;

  on(event: string, listener: (socket: WorkerSocket) => void): void {
    if (event === "connection") this.connectionListener = listener;
  }

  add(socket: WorkerSocket): void {
    this.sockets.set(socket.id, socket);
    this.connectionListener?.(socket);
  }

  remove(socket: WorkerSocket): void { this.sockets.delete(socket.id); }
  find(socket: WebSocket): WorkerSocket | undefined {
    return Array.from(this.sockets.values()).find((candidate) => candidate.wraps(socket));
  }

  to(target: string): { emit: (event: string, payload?: unknown) => void } {
    return {
      emit: (event, payload) => {
        for (const socket of this.sockets.values()) {
          if (socket.id === target || socket.hasChannel(target)) socket.emit(event, payload);
        }
      },
    };
  }
}

export class GameDurableObject {
  private readonly manager = new RoomManager(promptPairs as PromptPair[], 180 * 60 * 1000);
  private readonly io = new WorkerSocketServer();
  private ready: Promise<void>;
  private serial: Promise<void> = Promise.resolve();

  constructor(private readonly state: DurableObjectState) {
    this.ready = state.blockConcurrencyWhile(async () => {
      const snapshot = await state.storage.get<Parameters<RoomManager["restoreSnapshot"]>[0]>("rooms");
      if (snapshot) this.manager.restoreSnapshot(snapshot);
      registerSocketHandlers(this.io as never, this.manager);
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.ready;
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    const id = crypto.randomUUID();
    server.serializeAttachment({ id });
    this.attach(server, id);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(webSocket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    await this.ready;
    if (typeof raw !== "string") return;
    try {
      const message = JSON.parse(raw) as WireMessage;
      await this.runExclusive(async () => {
        this.attach(webSocket);
        this.io.find(webSocket)?.receive(message);
        await this.state.storage.put("rooms", this.manager.exportSnapshot());
        await this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000);
      });
    } catch {
      webSocket.send(JSON.stringify({ event: "server:error", payload: { message: "Invalid socket message." } }));
    }
  }

  async webSocketClose(webSocket: WebSocket): Promise<void> {
    await this.runExclusive(async () => {
      this.attach(webSocket);
      this.io.find(webSocket)?.disconnect();
      await this.state.storage.put("rooms", this.manager.exportSnapshot());
    });
  }

  async webSocketError(webSocket: WebSocket): Promise<void> { await this.webSocketClose(webSocket); }

  async alarm(): Promise<void> {
    await this.runExclusive(async () => {
      this.manager.cleanupExpiredRooms();
      await this.state.storage.put("rooms", this.manager.exportSnapshot());
      await this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000);
    });
  }

  private attach(webSocket: WebSocket, knownId?: string): void {
    if (this.io.find(webSocket)) return;
    const attachment = webSocket.deserializeAttachment() as { id?: string } | null;
    const id = knownId ?? attachment?.id ?? crypto.randomUUID();
    webSocket.serializeAttachment({ id });
    this.io.add(new WorkerSocket(webSocket, this.io, id));
  }

  private runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const result = this.serial.then(task, task);
    this.serial = result.then(() => undefined, () => undefined);
    return result;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({ ok: true, service: "off-prompt" });
    if (url.pathname === "/socket") {
      const id = env.GAME.idFromName("off-prompt-game-rooms");
      return env.GAME.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};
