/**
 * Purpose: Merge PHP-style request inputs so handlers can read query, body, and multipart fields like $_REQUEST.
 * Expected request body: Form, JSON, or multipart fields from legacy clients.
 * Expected query parameters: Any legacy query string keys.
 * Expected headers: Standard request headers, including multipart content types when applicable.
 * Expected response structure: Middleware populates request.legacyInput and calls next().
 */
import { NextFunction, Request, Response } from "express";

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  return value;
}

export function legacyRequestMiddleware(request: Request, _response: Response, next: NextFunction): void {
  const mergedInput: Record<string, unknown> = {
    ...request.query,
    ...request.body
  };

  for (const [key, value] of Object.entries(mergedInput)) {
    mergedInput[key] = normalizeValue(value);
  }

  request.legacyInput = mergedInput;

  next();
}

export function getLegacyInput(request: Request): Record<string, unknown> {
  return request.legacyInput ?? {};
}

export function getLegacyString(request: Request, key: string, fallback = ""): string {
  const value = getLegacyInput(request)[key];
  if (value === undefined || value === null) {
    return fallback;
  }
  return String(value);
}

export function getLegacyOptionalString(request: Request, key: string): string | undefined {
  const value = getLegacyInput(request)[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value);
}
