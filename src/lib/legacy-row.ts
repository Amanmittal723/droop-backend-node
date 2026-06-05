/**
 * Purpose: Convert database rows to PHP-style legacy JSON values.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Objects whose primitive numeric fields are stringified like mysql_fetch_assoc output.
 */
export type LegacyRow = Record<string, unknown>;

export function stringifyLegacyValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stringifyLegacyValue);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }

  if (value && typeof value === "object") {
    const maybeToJSON = value as { toJSON?: () => unknown };
    if (typeof maybeToJSON.toJSON === "function" && Object.getPrototypeOf(value) !== Object.prototype) {
      return stringifyLegacyValue(maybeToJSON.toJSON());
    }
    return stringifyLegacyRow(value as LegacyRow);
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return value;
}

export function stringifyLegacyRow(row: LegacyRow): LegacyRow {
  const normalized: LegacyRow = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[key] = stringifyLegacyValue(value);
  }

  return normalized;
}
