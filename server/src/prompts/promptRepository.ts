import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PromptPair } from "./promptTypes.js";
import { validatePromptPairs } from "./promptValidator.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));

function candidatePromptPaths(): string[] {
  return [
    resolve(moduleDir, "../data/promptPairs.json"),
    resolve(process.cwd(), "src/data/promptPairs.json"),
    resolve(process.cwd(), "server/src/data/promptPairs.json"),
    resolve(process.cwd(), "dist/data/promptPairs.json"),
  ];
}

export function resolvePromptDataPath(): string {
  const path = candidatePromptPaths().find((candidate) => existsSync(candidate));
  if (!path) {
    throw new Error("Could not find server/src/data/promptPairs.json.");
  }
  return path;
}

export function loadPromptPairs(): PromptPair[] {
  const promptPath = resolvePromptDataPath();
  const rawJson = readFileSync(promptPath, "utf8");
  const rawPrompts = JSON.parse(rawJson) as unknown;
  return validatePromptPairs(rawPrompts);
}
