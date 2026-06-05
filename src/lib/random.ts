/**
 * Purpose: Replicate the legacy PHP random lowercase alphanumeric filename generator.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Random string matching PHP's character set semantics.
 */
const LEGACY_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";

export function legacyRandomString(length: number): string {
  let output = "";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * LEGACY_CHARS.length);
    output += LEGACY_CHARS[randomIndex];
  }
  return output;
}
