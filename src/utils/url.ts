/**
 * Normalizes various URL formats into a valid URL with https:// protocol
 *
 * Accepts:
 * - https://www.example.com
 * - http://www.example.com
 * - www.example.com
 * - example.com
 *
 * Returns: https://www.example.com (or https://example.com if no www)
 */
export function normalizeUrl(input: string): URL {
  // Remove leading/trailing whitespace
  let url = input.trim();

  // If it already has a protocol, validate and return
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      return new URL(url);
    } catch {
      throw new Error("Invalid URL format");
    }
  }

  // Add https:// protocol if missing
  url = `https://${url}`;

  // Validate the constructed URL
  try {
    return new URL(url);
  } catch {
    throw new Error(
      "Invalid URL format. Please provide a valid URL (e.g., https://example.com, www.example.com, or example.com)"
    );
  }
}

/**
 * Validates if a string can be converted to a valid URL
 */
export function isValidUrlInput(input: string): boolean {
  try {
    normalizeUrl(input);
    return true;
  } catch {
    return false;
  }
}
