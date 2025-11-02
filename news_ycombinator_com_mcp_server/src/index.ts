#!/usr/bin/env node
/**
 * MCP Server for news.ycombinator.com
 *
 * This server uses Stagehand V3 for browser automation.
 *
 * Stagehand Reference:
 * - stagehand.act("instruction") - Perform atomic actions (click, type, etc.)
 * - stagehand.extract("instruction", schema) - Extract structured data
 * - stagehand.observe("instruction") - Get candidate actions before acting
 * - stagehand.agent({ ... }).execute() - Run multi-step autonomous tasks
 *
 * Key Tips:
 * - Act instructions should be atomic: "Click the button" not "Click button and submit"
 * - Extract with zod schemas for type safety
 * - Use observe + act pattern to cache DOM state
 * - Access pages via stagehand.context.pages()[0]
 *
 * For full API reference, see: https://docs.stagehand.dev
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import dotenv from "dotenv";
import os from "os";
import path from "path";
import { existsSync } from "fs";

// Load environment variables from standard locations
const GLOBAL_ENV_PATH = path.join(os.homedir(), ".mcpkit", ".env");
if (existsSync(GLOBAL_ENV_PATH)) {
  dotenv.config({ path: GLOBAL_ENV_PATH, override: false });
}

const LOCAL_ENV_PATH = path.join(process.cwd(), ".env");
if (existsSync(LOCAL_ENV_PATH)) {
  dotenv.config({ path: LOCAL_ENV_PATH, override: false });
}

// Define the target URL for news.ycombinator.com
const TARGET_URL = "https://news.ycombinator.com/";

// MCP Server for news.ycombinator.com
const server = new Server(
  {
    name: "news_ycombinator_com",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize Stagehand instance
let stagehand: Stagehand;

/**
 * Get saved context ID from mcpkit contexts
 */
async function getSavedContextId(domain: string): Promise<string | null> {
  try {
    const fs = await import("fs/promises");
    const contextFilePath = path.join(
      os.homedir(),
      ".mcpkit",
      "contexts",
      `${domain}.txt`
    );
    const contextId = await fs.readFile(contextFilePath, "utf-8");
    return contextId.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Create a new browser context
 */
async function createNewContext(): Promise<string> {
  const https = await import("https");
  const apiKey = process.env.BROWSERBASE_API_KEY!;
  const projectId = process.env.BROWSERBASE_PROJECT_ID!;

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ projectId });
    const options = {
      hostname: "api.browserbase.com",
      path: "/v1/contexts",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BB-API-Key": apiKey,
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => {
        try {
          const response = JSON.parse(responseData);
          resolve(response.id);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

/**
 * Get or create a browser context ID for this domain
 */
async function getOrCreateContextId(
  domain: string
): Promise<string | undefined> {
  // First, check if context ID is set in environment
  if (process.env.BROWSERBASE_CONTEXT_ID) {
    return process.env.BROWSERBASE_CONTEXT_ID;
  }

  // Second, check if we have a saved context from mcpkit
  const savedContextId = await getSavedContextId(domain);
  if (savedContextId) {
    console.error(`♻️  Using saved context from mcpkit: ${savedContextId}`);
    return savedContextId;
  }

  // Third, create a new context automatically
  try {
    const newContextId = await createNewContext();
    console.error(`✅ Created new browser context: ${newContextId}`);
    console.error(`💡 Add this to your .env file to reuse this session:`);
    console.error(`   BROWSERBASE_CONTEXT_ID=${newContextId}\n`);
    return newContextId;
  } catch (error) {
    console.error(`⚠️  Failed to create browser context:`, error);
    console.error(`   Continuing without persistent context.\n`);
    return undefined;
  }
}

/**
 * Initializes the Stagehand browser automation instance if it hasn't been already.
 * Ensures that the browser and model are ready for use.
 * @returns The initialized Stagehand instance.
 */
async function initStagehand(): Promise<Stagehand> {
  if (!stagehand) {
    // Extract domain from TARGET_URL
    const domain = new URL(TARGET_URL).hostname;

    // Get or create context ID
    const contextId = await getOrCreateContextId(domain);

    stagehand = new Stagehand({
      env: "BROWSERBASE",
      verbose: 0, // Disable logging for MCP stdio compatibility
      browserbaseSessionCreateParams: {
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
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
      model: {
        modelName: "google/gemini-2.5-flash",
        apiKey:
          process.env.GEMINI_API_KEY ??
          process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
      },
    });
    await stagehand.init();

    // Log the live view URL for debugging
    if (stagehand.browserbaseSessionId) {
      console.error(
        `🔗 Live view: https://app.browserbase.com/sessions/${stagehand.browserbaseSessionId}`
      );
    }
  }
  return stagehand;
}

/**
 * Helper function to perform an action using observe + act pattern with error checking.
 */
async function performAction(
  stagehand: Stagehand,
  instruction: string
): Promise<void> {
  const actions = await stagehand.observe(instruction);
  if (!actions || actions.length === 0) {
    throw new Error(`Could not find element for action: "${instruction}"`);
  }
  await stagehand.act(actions[0]);
}

// Define Zod schemas for tool arguments
const GetTopStoriesArgsSchema = z.object({});

const NavigateToSectionArgsSchema = z.object({
  sectionName: z.string().min(1),
});

const ViewCommentsArgsSchema = z.object({
  storyTitle: z.string().min(1),
});

const SubmitNewStoryArgsSchema = z.object({
  title: z.string().min(1),
  url: z.string().url().optional(),
  text: z.string().optional(),
});

const SearchStoriesArgsSchema = z.object({
  query: z.string().min(1),
});

const ViewUserProfileArgsSchema = z.object({
  username: z.string().min(1),
});

// List available tools for the news.ycombinator.com server
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_top_stories",
        description:
          "Retrieve the top stories displayed on the Hacker News homepage.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "navigate_to_section",
        description:
          "Navigate to a specific section of Hacker News (e.g., 'new', 'past', 'comments', 'ask', 'show', 'jobs').",
        inputSchema: {
          type: "object",
          properties: {
            sectionName: {
              type: "string",
              description:
                "The name of the section to navigate to (e.g., 'new', 'past', 'comments', 'ask', 'show', 'jobs', 'threads', 'welcome').",
            },
          },
          required: ["sectionName"],
        },
      },
      {
        name: "view_comments",
        description: "View the comments for a specific story.",
        inputSchema: {
          type: "object",
          properties: {
            storyTitle: {
              type: "string",
              description: "The title of the story for which to view comments.",
            },
          },
          required: ["storyTitle"],
        },
      },
      {
        name: "submit_new_story",
        description: "Submit a new story to Hacker News.",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The title of the story to submit.",
            },
            url: {
              type: "string",
              description:
                "The URL of the story to submit (optional, if not a URL, then it's a text post).",
            },
            text: {
              type: "string",
              description:
                "The text content of the story (optional, used for text posts).",
            },
          },
          required: ["title"],
        },
      },
      {
        name: "search_stories",
        description:
          "Search Hacker News for stories or comments matching a specific query.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "view_user_profile",
        description: "View the profile of a specific user.",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "The username of the user whose profile to view.",
            },
          },
          required: ["username"],
        },
      },
    ],
  };
});

// Handle incoming tool call requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const stagehand = await initStagehand();
  const page = stagehand.context.pages()[0];

  try {
    // Ensure we start from a consistent page state for each tool call
    // Only navigate if the current URL is not already the target or a sub-path
    if (!page.url().startsWith(TARGET_URL)) {
      await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
    }
  } catch (initialGotoError) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Error navigating to initial page: ${
            initialGotoError instanceof Error
              ? initialGotoError.message
              : String(initialGotoError)
          }`,
        },
      ],
      isError: true,
    };
  }

  try {
    let result: any;
    let screenshotBase64: string;

    switch (request.params.name) {
      case "get_top_stories": {
        const args = GetTopStoriesArgsSchema.parse(request.params.arguments);
        // Already on homepage or navigated there by initial goto, so no explicit navigation step.

        result = await stagehand.extract(
          "Extract an array of top stories from the homepage, each with 'title' (string), 'url' (string), 'points' (number), 'author' (string), and 'comments' (number or string indicating count)",
          z.object({
            stories: z.array(
              z.object({
                title: z.string(),
                url: z.string(),
                points: z.number().nullable(),
                author: z.string().nullable(),
                comments: z.number().nullable(),
              })
            ),
          })
        );
        if (!result || !result.stories) {
          throw new Error(
            "Failed to extract top stories or stories array is empty."
          );
        }
        const screenshot = await page.screenshot({ fullPage: true });
        screenshotBase64 = screenshot.toString("base64");
        break;
      }

      case "navigate_to_section": {
        const args = NavigateToSectionArgsSchema.parse(
          request.params.arguments
        );
        const { sectionName } = args;

        await performAction(
          stagehand,
          `Click on the "${sectionName}" link in the top navigation bar`
        );
        await page.waitForLoadState("domcontentloaded");

        result = await stagehand.extract(
          `Extract a brief summary of the content on the current page after navigating to the "${sectionName}" section.`,
          z.object({ summary: z.string() })
        );
        if (!result || !result.summary) {
          throw new Error("Failed to extract page summary after navigation.");
        }
        const screenshot = await page.screenshot({ fullPage: true });
        screenshotBase64 = screenshot.toString("base64");
        break;
      }

      case "view_comments": {
        const args = ViewCommentsArgsSchema.parse(request.params.arguments);
        const { storyTitle } = args;

        await performAction(
          stagehand,
          `Find the story with title "${storyTitle}" and clcik on the 'comments' link associated with it.`
        );

        await page.waitForLoadState("domcontentloaded");

        result = await stagehand.extract(
          "Extract an array of comment objects, each with 'author' (string) and 'text' (string)",
          z.object({
            comments: z.array(
              z.object({
                author: z.string(),
                text: z.string(),
                createdAt: z.string(),
              })
            ),
          })
        );
        if (!result || !result.comments) {
          throw new Error(
            "Failed to extract comments or comments array is empty."
          );
        }
        const screenshot = await page.screenshot({ fullPage: true });
        screenshotBase64 = screenshot.toString("base64");
        break;
      }

      case "submit_new_story": {
        const args = SubmitNewStoryArgsSchema.parse(request.params.arguments);
        const { title, url, text } = args;

        await performAction(stagehand, "Click on the 'submit' link");
        await page.waitForLoadState("domcontentloaded");

        await performAction(
          stagehand,
          `Type "${title}" into the 'title' input field`
        );

        if (url) {
          await performAction(
            stagehand,
            `Type "${url}" into the 'url' input field`
          );
        } else if (text) {
          await performAction(
            stagehand,
            `Type "${text}" into the 'text' textarea`
          );
        }

        await performAction(stagehand, "Click on the 'submit' button");
        await page.waitForLoadState("domcontentloaded");

        result = await stagehand.extract(
          "Extract a brief summary confirming the post submission or describing the current page state after submission attempt",
          z.object({ summary: z.string() })
        );
        if (!result || !result.summary) {
          throw new Error("Failed to extract submission summary.");
        }
        const screenshot = await page.screenshot({ fullPage: true });
        screenshotBase64 = screenshot.toString("base64");
        break;
      }

      case "search_stories": {
        const args = SearchStoriesArgsSchema.parse(request.params.arguments);
        const { query } = args;

        // Click on the 'Search' link or button to reveal the search input if not visible
        try {
          await performAction(
            stagehand,
            "Click on the 'search' link in the footer or navigation"
          );
          await page.waitForLoadState("domcontentloaded");
        } catch (e) {
          console.error(
            "Could not find a 'search' link, attempting to type directly if input is present. Error:",
            e instanceof Error ? e.message : String(e)
          );
        }

        await performAction(
          stagehand,
          `Type "${query}" into the search input field`
        );
        await performAction(
          stagehand,
          "Press Enter or click the search button"
        );
        await page.waitForLoadState("domcontentloaded");

        result = await stagehand.extract(
          "Extract an array of search result objects, each with 'title' (string), 'url' (string, optional), 'points' (number, optional), 'author' (string, optional), and 'comments' (number, optional) or 'text' (string, optional) for comments.",
          z.object({
            searchResults: z.array(
              z.object({
                title: z.string(),
                url: z.string().optional(),
                points: z.number().optional(),
                author: z.string().optional(),
                comments: z.number().optional(),
                text: z.string().optional(),
              })
            ),
          })
        );
        if (!result || !result.searchResults) {
          throw new Error(
            "Failed to extract search results or searchResults array is empty."
          );
        }
        const screenshot = await page.screenshot({ fullPage: true });
        screenshotBase64 = screenshot.toString("base64");
        break;
      }

      case "view_user_profile": {
        const args = ViewUserProfileArgsSchema.parse(request.params.arguments);
        const { username } = args;

        await performAction(
          stagehand,
          `Click on the username link for "${username}"`
        );
        await page.waitForLoadState("domcontentloaded");

        result = await stagehand.extract(
          "Extract user profile information including username, creation date, karma, 'about' text, and a list of submitted posts (title and url).",
          z.object({
            userProfile: z.object({
              username: z.string(),
              created: z.string(),
              karma: z.number(),
              about: z.string().optional(),
              submitted: z
                .array(
                  z.object({
                    title: z.string(),
                    url: z.string().optional(),
                  })
                )
                .optional(),
            }),
          })
        );
        if (!result || !result.userProfile) {
          throw new Error("Failed to extract user profile information.");
        }
        const screenshot = await page.screenshot({ fullPage: true });
        screenshotBase64 = screenshot.toString("base64");
        break;
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `❌ Unknown tool: ${request.params.name}`,
            },
          ],
          isError: true,
        };
    }

    // Ensure result and screenshotBase64 are always set by the successful tool execution
    if (!result || !screenshotBase64) {
      throw new Error(
        "Tool execution succeeded but did not produce a result or screenshot."
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
        {
          type: "image",
          data: screenshotBase64,
          mimeType: "image/png",
        },
      ],
    };
  } catch (error) {
    // Take a screenshot on error for debugging purposes if possible
    let errorScreenshotBase64: string | undefined;
    try {
      const errorScreenshot = await page.screenshot({ fullPage: true });
      errorScreenshotBase64 = errorScreenshot.toString("base64");
    } catch (screenshotError) {
      console.error("Failed to take screenshot on error:", screenshotError);
    }

    const errorContent: Array<{
      type: "text" | "image";
      text?: string;
      data?: string;
      mimeType?: string;
    }> = [
      {
        type: "text",
        text: `❌ Error executing tool '${request.params.name}': ${
          error instanceof Error ? error.message : String(error)
        }\nStack: ${error instanceof Error ? error.stack : "N/A"}`,
      },
    ];

    if (errorScreenshotBase64) {
      errorContent.push({
        type: "image",
        data: errorScreenshotBase64,
        mimeType: "image/png",
      });
    }

    return {
      content: errorContent,
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("news_ycombinator_com MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
