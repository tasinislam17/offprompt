export function now(): number {
  return Date.now();
}

export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}
