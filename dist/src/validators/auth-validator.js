"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimLegacyUsername = trimLegacyUsername;
exports.shouldUpdateDeviceToken = shouldUpdateDeviceToken;
/**
 * Purpose: Apply only the legacy validations present in the PHP login and signup flows.
 * Expected request body: Legacy auth request fields such as username, password, fb_id, and fb_email.
 * Expected query parameters: None beyond values merged into legacyInput.
 * Expected headers: None.
 * Expected response structure: Small validation helper return values consumed by the auth controller.
 */
function trimLegacyUsername(username) {
    return username.trim();
}
function shouldUpdateDeviceToken(deviceToken) {
    return deviceToken.length > 15;
}
