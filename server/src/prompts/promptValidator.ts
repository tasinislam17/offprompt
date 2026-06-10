import type { GameMode, PromptVibe, SafeLevel } from "@off-prompt/shared";
import type { PromptPair, PromptPairType, TargetRule } from "./promptTypes.js";

const gameModes = new Set<GameMode>(["party", "case"]);
const promptTypes = new Set<PromptPairType>([
  "open",
  "numeric",
  "player_dynamic",
  "spicy",
  "who_here",
  "dynamic",
  "choice",
  "hypothetical",
  "ranking",
]);
const answerFormats = new Set(["text", "number"]);
const safeLevels = new Set<SafeLevel>(["safe", "spicy", "adult"]);
const promptVibes = new Set<PromptVibe>(["funny", "awkward", "chaotic", "roast", "flirty", "suspicious"]);
const targetRules = new Set<TargetRule>(["random_active_player", null]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requiredString(record: Record<string, unknown>, field: string, id: string): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Prompt ${id} is missing required string field ${field}.`);
  }
  return value;
}

function requiredNumber(record: Record<string, unknown>, field: string, id: string): number {
  const value = record[field];
  if (!Number.isInteger(value)) {
    throw new Error(`Prompt ${id} must define integer field ${field}.`);
  }
  return value as number;
}

export function validatePromptPairs(rawPrompts: unknown): PromptPair[] {
  if (!Array.isArray(rawPrompts)) {
    throw new Error("Prompt data must be a JSON array.");
  }

  const seenIds = new Set<string>();
  const prompts: PromptPair[] = [];

  for (const rawPrompt of rawPrompts) {
    if (!isRecord(rawPrompt)) {
      throw new Error("Every prompt pair must be an object.");
    }

    const id = requiredString(rawPrompt, "id", "unknown");
    if (seenIds.has(id)) {
      throw new Error(`Duplicate prompt pair id found: ${id}.`);
    }
    seenIds.add(id);

    const category = requiredString(rawPrompt, "category", id);
    const type = requiredString(rawPrompt, "type", id);
    if (!promptTypes.has(type as PromptPairType)) {
      throw new Error(`Prompt ${id} has unsupported type ${type}.`);
    }

    const mainPrompt = requiredString(rawPrompt, "mainPrompt", id);
    const offPrompt = requiredString(rawPrompt, "offPrompt", id);
    if (mainPrompt.trim() === offPrompt.trim()) {
      throw new Error(`Prompt ${id} cannot use identical mainPrompt and offPrompt values.`);
    }

    const answerFormat = requiredString(rawPrompt, "answerFormat", id);
    if (!answerFormats.has(answerFormat)) {
      throw new Error(`Prompt ${id} has unsupported answerFormat ${answerFormat}.`);
    }

    const safeLevel = requiredString(rawPrompt, "safeLevel", id);
    if (!safeLevels.has(safeLevel as SafeLevel)) {
      throw new Error(`Prompt ${id} has unsupported safeLevel ${safeLevel}.`);
    }

    const vibe = requiredString(rawPrompt, "vibe", id);
    if (!promptVibes.has(vibe as PromptVibe)) {
      throw new Error(`Prompt ${id} has unsupported vibe ${vibe}.`);
    }

    const modeCompatibility = rawPrompt.modeCompatibility;
    if (!Array.isArray(modeCompatibility) || modeCompatibility.length === 0) {
      throw new Error(`Prompt ${id} must define modeCompatibility.`);
    }
    for (const mode of modeCompatibility) {
      if (!gameModes.has(mode as GameMode)) {
        throw new Error(`Prompt ${id} has unsupported mode ${String(mode)}.`);
      }
    }

    const tags = rawPrompt.tags;
    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string")) {
      throw new Error(`Prompt ${id} must define tags as strings.`);
    }

    const requiresTargetPlayer = rawPrompt.requiresTargetPlayer;
    if (typeof requiresTargetPlayer !== "boolean") {
      throw new Error(`Prompt ${id} must define requiresTargetPlayer.`);
    }

    const targetRule = rawPrompt.targetRule as TargetRule;
    if (!targetRules.has(targetRule)) {
      throw new Error(`Prompt ${id} has unsupported targetRule ${String(targetRule)}.`);
    }

    const hasPlayerPlaceholder = mainPrompt.includes("{player}") || offPrompt.includes("{player}");
    if (requiresTargetPlayer) {
      if (targetRule !== "random_active_player") {
        throw new Error(`Prompt ${id} needs targetRule random_active_player.`);
      }
      if (!hasPlayerPlaceholder) {
        throw new Error(`Dynamic prompt ${id} must include {player} in at least one prompt variant.`);
      }
    }
    if (hasPlayerPlaceholder && targetRule !== "random_active_player") {
      throw new Error(`Prompt ${id} uses {player} and needs targetRule random_active_player.`);
    }
    if (hasPlayerPlaceholder && !requiresTargetPlayer) {
      throw new Error(`Prompt ${id} uses {player} and must set requiresTargetPlayer to true.`);
    }

    const minPlayers = requiredNumber(rawPrompt, "minPlayers", id);
    const maxPlayers = requiredNumber(rawPrompt, "maxPlayers", id);
    if (minPlayers < 3 || maxPlayers > 10 || minPlayers > maxPlayers) {
      throw new Error(`Prompt ${id} has invalid player bounds.`);
    }

    prompts.push({
      id,
      category,
      type: type as PromptPairType,
      modeCompatibility: modeCompatibility as GameMode[],
      requiresTargetPlayer,
      targetRule,
      mainPrompt,
      offPrompt,
      answerFormat: answerFormat as PromptPair["answerFormat"],
      minPlayers,
      maxPlayers,
      safeLevel: safeLevel as SafeLevel,
      vibe: vibe as PromptVibe,
      tags: tags as string[],
    });
  }

  if (prompts.length === 0) {
    throw new Error("Prompt data cannot be empty.");
  }

  return prompts;
}
