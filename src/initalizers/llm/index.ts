import { loadEnv } from "../../config/env.js";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { LanguageModel } from "ai";

let cachedModel: LanguageModel | null = null;

/**
 * Get the configured LLM model based on MODEL_PROVIDER env var
 * Supports: openai/, anthropic/, google/ prefixes
 *
 * Examples:
 * - openai/gpt-4o
 * - anthropic/claude-3-5-sonnet-20241022
 * - google/gemini-2.0-flash
 */
export function getModel(): LanguageModel {
  if (cachedModel) {
    return cachedModel;
  }

  const { MODEL_PROVIDER, MODEL_API_KEY } = loadEnv();

  console.error(`Using model: ${MODEL_PROVIDER}`);

  // Parse provider and model name
  if (MODEL_PROVIDER.startsWith("openai/")) {
    const modelName = MODEL_PROVIDER.replace("openai/", "");
    const openai = createOpenAI({ apiKey: MODEL_API_KEY });
    cachedModel = openai(modelName);
  } else if (MODEL_PROVIDER.startsWith("anthropic/")) {
    const modelName = MODEL_PROVIDER.replace("anthropic/", "");
    const anthropic = createAnthropic({ apiKey: MODEL_API_KEY });
    cachedModel = anthropic(modelName);
  } else if (MODEL_PROVIDER.startsWith("google/")) {
    const modelName = MODEL_PROVIDER.replace("google/", "");
    const google = createGoogleGenerativeAI({ apiKey: MODEL_API_KEY });
    cachedModel = google(modelName);
  } else if (MODEL_PROVIDER.startsWith("xai/")) {
    const modelName = MODEL_PROVIDER.replace("xai/", "");
    const xai = createXai({ apiKey: MODEL_API_KEY });
    cachedModel = xai(modelName);
  } else {
    throw new Error(
      `Unsupported model provider: ${MODEL_PROVIDER}. Must start with openai/, anthropic/, google/, or xai/`
    );
  }

  return cachedModel;
}
