import { Stagehand } from "@browserbasehq/stagehand";
import { lookupCredentialsIn1Password } from "../../1password/index.js";
import { StagehandPage } from "../schemas/index.js";

import {
  analyzeAuthenticationState,
  logAuthenticationAnalysis,
} from "./analysis.js";
import { waitForUserInput, openDebuggerUrl, getDebugUrl } from "./helpers.js";

/**
 * Authenticate into the website
 */
export async function authenticateToWebsite(
  stagehand: Stagehand,
  url: string,
  domain: string
): Promise<void> {
  const context = stagehand.context;
  let activePage: StagehandPage;

  try {
    activePage = await context.awaitActivePage(10_000);
  } catch {
    throw new Error(
      "Unable to locate an active browser page for authentication."
    );
  }

  await activePage.goto(url, { waitUntil: "domcontentloaded" });

  let analysis = await analyzeAuthenticationState(stagehand, activePage);

  if (!analysis.requiresAuth) {
    console.log("🔓 No authentication required.");
    return;
  }

  logAuthenticationAnalysis(analysis, domain);

  const credentials = await lookupCredentialsIn1Password(domain);
  console.log("Credentials from 1Password:", credentials);

  // If there's a login button to click, click it first
  if (analysis.loginButton) {
    console.log(`🖱️  Clicking login button: "${analysis.loginButton}"`);
    try {
      await stagehand.act(analysis.loginButton);
      await activePage.waitForLoadState("networkidle", 5_000).catch(() => {});
      // Re-analyze after clicking the button
      analysis = await analyzeAuthenticationState(stagehand, activePage);
    } catch (error) {
      console.log(
        `⚠️  Failed to click login button: ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  // Attempt automatic login if credentials are available
  if (credentials && analysis.canAutofill) {
    console.log(
      "\n🔐 Attempting automatic login with 1Password credentials..."
    );
    try {
      // Use Stagehand to fill in the login form
      await stagehand.act(
        `Type "${credentials.username}" into the username or email field`
      );
      await stagehand.act(
        `Type "${credentials.password}" into the password field`
      );
      await stagehand.act("Click the login or sign in button");

      // Wait for navigation/login to complete
      await activePage.waitForLoadState("networkidle", 10_000).catch(() => {});

      // Re-analyze to check if login succeeded
      analysis = await analyzeAuthenticationState(stagehand, activePage);

      if (!analysis.requiresAuth) {
        console.log("✅ Automatic login successful!");
        return;
      } else {
        console.log(
          "⚠️  Automatic login may have failed, falling back to manual authentication"
        );
      }
    } catch (error) {
      console.log(
        `⚠️  Automatic login failed: ${
          error instanceof Error ? error.message : error
        }`
      );
      console.log("Falling back to manual authentication...");
    }
  }

  console.log("\n🌐 Opening browser session for authentication...");
  console.log(`🔗 Debug URL: ${getDebugUrl(stagehand)}`);
  console.log(
    "\n👉 Please log in to the website in the browser window that just opened."
  );

  // Open the debugger URL in the default browser
  await openDebuggerUrl(stagehand.browserbaseSessionId!);

  console.log(
    "\n⏳ Once you're logged in, press Enter to continue (or type 'skip' to skip authentication)...\n"
  );
  const userInput = await waitForUserInput();

  if (userInput.toLowerCase().trim() === "skip") {
    console.log("⏭️  Skipping authentication, returning to original page...");
    await activePage.goto(url, { waitUntil: "domcontentloaded" });
    return;
  }

  // Re-analyze to confirm authentication succeeded
  analysis = await analyzeAuthenticationState(stagehand, activePage);

  if (analysis.requiresAuth) {
    throw new Error(
      "Authentication still required after manual verification. Please sign in and re-run the command."
    );
  }

  console.log("✅ Authentication confirmed.");
}
