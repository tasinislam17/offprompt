import { loadPromptPairs, resolvePromptDataPath } from "../prompts/promptRepository.js";

const prompts = loadPromptPairs();
const dynamicCount = prompts.filter((prompt) => prompt.requiresTargetPlayer).length;

console.log(
  JSON.stringify(
    {
      promptPath: resolvePromptDataPath(),
      count: prompts.length,
      dynamicCount,
      firstId: prompts[0]?.id,
      lastId: prompts[prompts.length - 1]?.id,
    },
    null,
    2
  )
);
