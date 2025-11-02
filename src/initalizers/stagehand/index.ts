import { AvailableModel, Stagehand } from "@browserbasehq/stagehand";
import { getOrCreateContext } from "../../services/session/index.js";
import { loadEnv } from "../../config/env.js";

loadEnv();

let stagehandInstance: Stagehand | null = null;

export const getStagehandInstance = async (
  domain: string,
  modelApiKey: string,
  modelName: AvailableModel,
  options?: {
    persistContext?: boolean;
  }
) => {
  if (!stagehandInstance) {
    if (!modelApiKey) {
      throw new Error("Missing API key. Set an API key in your environment.");
    }

    if (!modelName) {
      throw new Error(
        "Missing model name. Set a model name in your environment."
      );
    }

    const browserbaseProjectId = process.env.BROWSERBASE_PROJECT_ID;
    if (!browserbaseProjectId) {
      throw new Error(
        "Missing BROWSERBASE_PROJECT_ID in environment variables"
      );
    }

    const persistContext = options?.persistContext ?? true;

    let contextId: string | undefined;
    if (persistContext) {
      contextId = await getOrCreateContext(domain);
    }

    stagehandInstance = new Stagehand({
      env: "BROWSERBASE",
      browserbaseSessionCreateParams: {
        projectId: browserbaseProjectId,
        proxies: true,
        region: "us-east-1",
        browserSettings: contextId
          ? {
              context: {
                id: contextId,
                persist: true,
              },
            }
          : undefined,
      },
      cacheDir: `mcp-stagehand-${domain}`,
      model: {
        modelName: modelName,
        apiKey: modelApiKey,
      },
    });
    await stagehandInstance.init();
  }
  return stagehandInstance;
};
