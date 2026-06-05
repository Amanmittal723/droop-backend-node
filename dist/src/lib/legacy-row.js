"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyLegacyValue = stringifyLegacyValue;
exports.stringifyLegacyRow = stringifyLegacyRow;
function stringifyLegacyValue(value) {
    if (Array.isArray(value)) {
        return value.map(stringifyLegacyValue);
    }
    if (value instanceof Date) {
        return value.toISOString().slice(0, 19).replace("T", " ");
    }
    if (value && typeof value === "object") {
        const maybeToJSON = value;
        if (typeof maybeToJSON.toJSON === "function" && Object.getPrototypeOf(value) !== Object.prototype) {
            return stringifyLegacyValue(maybeToJSON.toJSON());
        }
        return stringifyLegacyRow(value);
    }
    if (typeof value === "boolean") {
        return value ? "1" : "0";
    }
    if (typeof value === "number" || typeof value === "bigint") {
        return String(value);
    }
    return value;
}
function stringifyLegacyRow(row) {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
        normalized[key] = stringifyLegacyValue(value);
    }
    return normalized;
}
