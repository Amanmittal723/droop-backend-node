"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyRandomString = legacyRandomString;
/**
 * Purpose: Replicate the legacy PHP random lowercase alphanumeric filename generator.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Random string matching PHP's character set semantics.
 */
const LEGACY_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";
function legacyRandomString(length) {
    let output = "";
    for (let index = 0; index < length; index += 1) {
        const randomIndex = Math.floor(Math.random() * LEGACY_CHARS.length);
        output += LEGACY_CHARS[randomIndex];
    }
    return output;
}
