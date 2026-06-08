const hostSessionKey = "off-prompt:host-session";
const playerSessionKey = "off-prompt:player-session";

export type HostSession = {
  roomCode: string;
  hostSessionToken: string;
};

export type PlayerSession = {
  roomCode: string;
  playerId: string;
  playerSessionToken: string;
  name: string;
};

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function createClientToken(): string {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getHostSession(roomCode: string): HostSession | null {
  const session = readJson<HostSession>(hostSessionKey);
  return session?.roomCode === roomCode ? session : null;
}

export function saveHostSession(session: HostSession): void {
  writeJson(hostSessionKey, session);
}

export function getPlayerSession(roomCode: string): PlayerSession | null {
  const session = readJson<PlayerSession>(playerSessionKey);
  return session?.roomCode === roomCode ? session : null;
}

export function savePlayerSession(session: PlayerSession): void {
  writeJson(playerSessionKey, session);
}

export function clearPlayerSession(): void {
  window.localStorage.removeItem(playerSessionKey);
}
