/**
 * Purpose: Provide legacy PHP-style timestamp formatting shared by compatibility handlers.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Timestamp strings formatted as YYYY-MM-DD HH:mm:ss.
 */
export function legacyNowString(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
