/**
 * Purpose: Share compatibility-safe SQL string helpers used by legacy repositories.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Escaped strings and normalized legacy list values.
 */
export function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

export function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function numericList(value: string): number[] {
  return csvToList(value)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
}
