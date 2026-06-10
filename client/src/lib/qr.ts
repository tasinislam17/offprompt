import { roomCode as normalizeRoomCode } from "./format";

export function parseRoomCodeFromQr(value: string): string | null {
  const rawValue = value.trim();
  if (!rawValue) {
    return null;
  }

  try {
    const url = new URL(rawValue);
    const codeFromQuery = url.searchParams.get("room");
    if (codeFromQuery) {
      const normalized = normalizeRoomCode(codeFromQuery);
      return normalized.length >= 4 ? normalized : null;
    }
  } catch {
    // Not a URL; fall through to raw code parsing.
  }

  const normalized = normalizeRoomCode(rawValue);
  return normalized.length >= 4 ? normalized : null;
}
