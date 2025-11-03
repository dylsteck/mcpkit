#!/usr/bin/env node

import { createMCPServer } from "./commands/create/index.js";
import { manageContexts } from "./commands/contexts/index.js";
import { setupSecrets, showSecrets } from "./commands/secrets/index.js";
import { normalizeUrl, isValidUrlInput } from "./utils/url.js";
import prompts from "prompts";

const COMMANDS = {
  secrets: "Set up API keys (Browserbase, Gemini)",
  create: "Create an MCP server by analyzing a website",
  contexts: "Manage saved browser contexts (list, delete, show)",
  help: "Show this help message",
  version: "Show version information",
};

async function showHelp() {
  console.log(`
mcpkit - Easy setup for MCPs with Browserbase

Usage:
  mcpkit [command] [options]

Commands:
  secrets                    ${COMMANDS.secrets}
  create [url]               ${COMMANDS.create}
                             URL formats: https://example.com, www.example.com, or example.com
  contexts [subcommand]      ${COMMANDS.contexts}
                             Accepts domain or URL in any format
  help                       ${COMMANDS.help}
  version                    ${COMMANDS.version}

Examples:
  mcpkit create https://example.com
  mcpkit create www.example.com
  mcpkit create example.com
  mcpkit contexts create example.com
  mcpkit contexts delete https://example.com

For more information, visit: https://github.com/kevoconnell/mcpkit
`);
}

async function showVersion() {
  // Read package.json from file system
  const fs = await import("fs/promises");
  const path = await import("path");
  const { fileURLToPath } = await import("url");

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = path.join(__dirname, "../package.json");
  const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(packageJsonContent) as { version: string };

  console.log(`${packageJson.version}`);
}

async function runCreate(url?: string, skipAuth?: boolean) {
  console.log("🔨 MCP Server Generator\n");

  if (!url) {
    const response = await prompts({
      type: "text",
      name: "url",
      message: "Enter the URL of the website to create an MCP for:",
      validate: (value) => {
        if (isValidUrlInput(value)) {
          return true;
        }
        return "Please enter a valid URL (e.g., https://example.com, www.example.com, or example.com)";
      },
    });

    if (!response.url) {
      console.log("❌ URL is required");
      process.exit(1);
    }

    url = response.url;
  }

  if (!url) {
    console.log("❌ URL is required");
    process.exit(1);
  }

  const normalizedUrl = normalizeUrl(url);

  await createMCPServer(normalizedUrl.href, { skipAuth });
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0]?.toLowerCase() || "help";

    // Handle flags
    if (command === "--help" || command === "-h") {
      await showHelp();
      process.exit(0);
    }

    if (command === "--version" || command === "-v") {
      await showVersion();
      process.exit(0);
    }

    // Handle commands
    switch (command) {
      case "secrets":
        const secretsSubcommand = args[1];
        if (secretsSubcommand === "show") {
          await showSecrets();
        } else {
          await setupSecrets();
        }
        break;

      case "create":
        const url = args[1];
        const skipAuth = args.includes("--skip-auth");
        await runCreate(url, skipAuth);
        break;

      case "contexts":
        const subcommand = args[1];
        const domain = args[2];
        await manageContexts(subcommand, domain);
        break;

      case "help":
        await showHelp();
        break;

      case "version":
        await showVersion();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "mcpkit help" for usage information.');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error(
      "\n❌ Error:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

main();
