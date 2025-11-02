import { Browserbase } from "@browserbasehq/sdk";
import { Stagehand } from "@browserbasehq/stagehand";

/**
 * Wait for user input and return what they typed
 */
export async function waitForUserInput(): Promise<string> {
  return new Promise<string>((resolve) => {
    process.stdin.once("data", (data) => {
      resolve(data.toString());
    });
  });
}

export function getDebugUrl(stagehand: Stagehand): string {
  const sessionId = stagehand.browserbaseSessionId;
  if (!sessionId) {
    throw new Error("No active Browserbase session");
  }
  return `https://browserbase.com/sessions/${sessionId}`;
}

/**
 * Open the Browserbase debugger URL in the default browser
 */
export async function openDebuggerUrl(sessionId: string): Promise<void> {
  const browserbase = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY!,
  });

  const { debuggerFullscreenUrl } = await browserbase.sessions.debug(sessionId);
  const { exec } = await import("child_process");
  const platform = process.platform;
  const command =
    platform === "win32"
      ? "start"
      : platform === "darwin"
      ? "open"
      : "xdg-open";
  exec(`${command} ${debuggerFullscreenUrl}`);
}
