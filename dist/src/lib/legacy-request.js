"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyRequestMiddleware = legacyRequestMiddleware;
exports.getLegacyInput = getLegacyInput;
exports.getLegacyString = getLegacyString;
exports.getLegacyOptionalString = getLegacyOptionalString;
function normalizeValue(value) {
    if (Array.isArray(value)) {
        return value.map(normalizeValue);
    }
    return value;
}
function legacyRequestMiddleware(request, _response, next) {
    const mergedInput = {
        ...request.query,
        ...request.body
    };
    for (const [key, value] of Object.entries(mergedInput)) {
        mergedInput[key] = normalizeValue(value);
    }
    request.legacyInput = mergedInput;
    next();
}
function getLegacyInput(request) {
    return request.legacyInput ?? {};
}
function getLegacyString(request, key, fallback = "") {
    const value = getLegacyInput(request)[key];
    if (value === undefined || value === null) {
        return fallback;
    }
    return String(value);
}
function getLegacyOptionalString(request, key) {
    const value = getLegacyInput(request)[key];
    if (value === undefined || value === null) {
        return undefined;
    }
    return String(value);
}
