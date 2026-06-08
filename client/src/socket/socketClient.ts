import { io } from "socket.io-client";
import type { ApiAck } from "@off-prompt/shared";

function serverUrl(): string {
  const configured = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (configured) {
    return configured;
  }

  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname || "localhost"}:3001`;
  }

  return window.location.origin;
}

export const socket = io(serverUrl(), {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  transports: ["websocket", "polling"],
});

export function ensureSocketConnected(): Promise<void> {
  if (socket.connected) {
    return Promise.resolve();
  }

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
    const timeout = window.setTimeout(() => {
      resolve({ ok: false, error: "Server did not respond. Try again." });
    }, 8000);

    socket.emit(event, payload, (response: ApiAck<T>) => {
      window.clearTimeout(timeout);
      resolve(response);
    });
  });
}
