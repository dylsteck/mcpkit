import { Stagehand } from "@browserbasehq/stagehand";
import { DiscoveredAction, DiscoveredActionsResponseSchema } from "../schemas/index.js";

/**
 * Discover available actions on the website
 */
export async function discoverActions(
  stagehand: Stagehand,
  domain: string
): Promise<DiscoveredAction[]> {
  console.log(`\n🔎 Discovering actions on ${domain}...`);

  const exampleJSON = JSON.stringify(
    {
      actions: [
        {
          name: "search_documentation",
          description: "Search the documentation for a specific query",
          parameters: [
            {
              name: "query",
              type: "string",
              description: "The search query to look up",
              required: true,
            },
          ],
          steps: [
            "Click on the search input field",
            "Type {query} into the search field",
            "Press enter or click search button",
          ],
          extractionSchema: {
            results: "array of search result objects with title and url",
          },
        },
        {
          name: "navigate_to_section",
          description: "Navigate to a specific section of the documentation",
          parameters: [
            {
              name: "sectionName",
              type: "string",
              description: "Name of the section to navigate to",
              required: true,
            },
          ],
          steps: [
            "Find the {sectionName} section in the navigation menu",
            "Click on the {sectionName} link",
          ],
        },
      ],
    },
    null,
    2
  );

  let result;
  try {
    console.log("🤖 Initializing AI agent for website exploration...");

    const agent = stagehand.agent({
      model: {
        modelName: "google/gemini-2.5-flash",
        apiKey:
          process.env.GEMINI_API_KEY ??
          process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      },
      systemPrompt: `You are a web automation analyst. Your job is to explore this ENTIRE website and identify the most useful actions a user might want to automate.

EXPLORATION STRATEGY:
1. Navigate through the main sections of the website
2. Click on navigation links, menus, and key areas
3. Identify patterns and common workflows
4. Focus on CRUD operations (Create, Read, Update, Delete) and data retrieval

CRITICAL: You MUST respond with ONLY valid JSON in this EXACT format, with no additional text:

${exampleJSON}

RULES:
- Return ONLY the JSON object, nothing else
- Each action MUST have: name (snake_case), description, parameters (array), steps (array)
- parameters: REQUIRED field, array of parameter objects with name, type, description, required
  - Include parameters for ANY action that needs user input (search query, item name, etc.)
  - Use empty array [] only if action truly needs no input
- steps: Use {parameterName} placeholder syntax in steps where parameters should be inserted
  - Example: "Type {query} into search field" or "Click on {sectionName} link"
  - This allows the generated code to interpolate the actual parameter values
- extractionSchema: optional but recommended for data retrieval actions
- Focus on 5-10 most useful and realistic actions
- Make sure steps are specific and actionable`,
    });

    console.log("🔍 Agent exploring website (this may take a minute)...");

    result = await agent.execute({
      instruction: `Explore this ENTIRE website thoroughly. Navigate through different pages, sections, and features. Identify the top 5-10 most useful actions a user might want to automate. Focus on CRUD operations and data retrieval. Return ONLY the JSON object, no additional text.`,
      maxSteps: 20,
    });

    if (!result || typeof result !== "object") {
      throw new Error("Agent execution returned invalid result");
    }

    if (!result.message) {
      throw new Error(
        "Agent execution returned result without message property"
      );
    }

    const responseMessage = result.message;
    console.log(`\n📋 Raw agent response:\n${responseMessage}\n`);

    // Strip markdown code blocks if present
    let jsonString = responseMessage.trim();

    // Remove ```json or ``` wrapper
    jsonString = jsonString.replace(/^```json\s*/i, "").replace(/^```\s*/, "");
    jsonString = jsonString.replace(/\s*```$/, "");
    jsonString = jsonString.trim();

    // Parse the cleaned JSON
    const parsed = JSON.parse(jsonString);

    // Validate with Zod schema
    const validated = DiscoveredActionsResponseSchema.parse(parsed);

    console.log(
      `✅ Successfully discovered ${validated.actions.length} actions:`
    );
    validated.actions.forEach((action, i) => {
      console.log(`  ${i + 1}. ${action.name} - ${action.description}`);
    });

    return validated.actions;
  } catch (error) {
    console.error("❌ Error during agent execution:", error);
    if (error instanceof Error) {
      console.error("   Error message:", error.message);
      if (error.stack) {
        console.error("   Stack trace:", error.stack);
      }
    }
    throw new Error(
      `Failed to discover actions: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
