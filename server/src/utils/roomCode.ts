import { randomInt } from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 5): string {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += alphabet[randomInt(0, alphabet.length)];
  }
  return code;
}

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidRoomCode(value: string): boolean {
  return /^[A-Z2-9]{4,6}$/.test(normalizeRoomCode(value));
}
