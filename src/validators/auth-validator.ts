/**
 * Purpose: Apply only the legacy validations present in the PHP login and signup flows.
 * Expected request body: Legacy auth request fields such as username, password, fb_id, and fb_email.
 * Expected query parameters: None beyond values merged into legacyInput.
 * Expected headers: None.
 * Expected response structure: Small validation helper return values consumed by the auth controller.
 */
export function trimLegacyUsername(username: string): string {
  return username.trim();
}

export function normalizeLegacyEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidLegacyEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function shouldUpdateDeviceToken(deviceToken: string): boolean {
  return deviceToken.length > 15;
}
