import type { ApiAck } from "@off-prompt/shared";

type Listener = (...args: any[]) => void;
type WireMessage = { event: string; payload?: unknown; id?: number; ack?: unknown };

class CloudflareSocket {
  connected = false;
  private ws: WebSocket | null = null;
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly acknowledgements = new Map<number, (value: unknown) => void>();
  private nextId = 1;
  private reconnectTimer: number | null = null;
  private retryDelay = 500;
  private explicitlyClosed = true;

  readonly io = {
    on: (event: string, listener: Listener) => this.on(`io:${event}`, listener),
    off: (event: string, listener: Listener) => this.off(`io:${event}`, listener),
  };

  on(event: string, listener: Listener): this {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  once(event: string, listener: Listener): this {
    const onceListener: Listener = (...args) => {
      this.off(event, onceListener);
      listener(...args);
    };
    return this.on(event, onceListener);
  }

  off(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, payload?: unknown, ack?: (response: any) => void): this {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      ack?.({ ok: false, error: "Server unavailable. Try again in a moment." });
      return this;
    }
    const id = ack ? this.nextId++ : undefined;
    if (id !== undefined && ack) this.acknowledgements.set(id, ack);
    this.ws.send(JSON.stringify({ event, payload, id }));
    return this;
  }

  connect(): this {
    if (!this.explicitlyClosed && this.ws && this.ws.readyState <= WebSocket.OPEN) return this;
    this.explicitlyClosed = false;
    const url = new URL("/socket", window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(url);
    this.ws = socket;
    socket.addEventListener("open", () => {
      if (this.ws !== socket) return;
      this.connected = true;
      this.retryDelay = 500;
      this.dispatch("connect");
    });
    socket.addEventListener("message", (message) => {
      if (typeof message.data !== "string") return;
      let data: WireMessage;
      try { data = JSON.parse(message.data) as WireMessage; } catch { return; }
      if (data.event === "__ack" && typeof data.id === "number") {
        const callback = this.acknowledgements.get(data.id);
        this.acknowledgements.delete(data.id);
        callback?.(data.ack);
        return;
      }
      if (data.event) this.dispatch(data.event, data.payload);
    });
    socket.addEventListener("error", () => this.dispatch("connect_error", new Error("Connection lost. Reconnecting...")));
    socket.addEventListener("close", () => {
      if (this.ws !== socket) return;
      const wasConnected = this.connected;
      this.connected = false;
      this.ws = null;
      if (wasConnected) this.dispatch("disconnect", "transport close");
      if (!this.explicitlyClosed) {
        this.scheduleReconnect();
      }
    });
    return this;
  }

  disconnect(): this {
    this.explicitlyClosed = true;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    return this;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    const delay = this.retryDelay;
    this.retryDelay = Math.min(this.retryDelay * 1.6, 3000);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.explicitlyClosed) return;
      this.connect();
      this.once("connect", () => this.dispatch("io:reconnect"));
    }, delay);
  }

  private dispatch(event: string, ...args: any[]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
}

export const socket = new CloudflareSocket();

export function ensureSocketConnected(): Promise<void> {
  if (socket.connected) return Promise.resolve();
  socket.connect();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
      reject(new Error("Server unavailable. Try again in a moment."));
    }, 6000);

    function onConnect() {
      window.clearTimeout(timeout);
      socket.off("connect_error", onError);
      resolve();
    }

    function onError() {
      window.clearTimeout(timeout);
      socket.off("connect", onConnect);
      reject(new Error("Connection lost. Reconnecting..."));
    }

    socket.once("connect", onConnect);
    socket.once("connect_error", onError);
  });
}

export async function emitWithAck<T>(event: string, payload: unknown): Promise<ApiAck<T>> {
  await ensureSocketConnected();

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve({ ok: false, error: "Server did not respond. Try again." }), 8000);
    socket.emit(event, payload, (response: ApiAck<T>) => {
      window.clearTimeout(timeout);
      resolve(response);
    });
  });
}
