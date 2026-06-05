/**
 * Purpose: Send PHP-style JSON responses without modern response normalization.
 * Expected request body: Controller-specific payload already prepared by the caller.
 * Expected query parameters: None.
 * Expected headers: Response content type is JSON when a JSON payload is sent.
 * Expected response structure: Exact compatibility payload passed by the caller.
 */
import { Response } from "express";
import { stringifyLegacyValue } from "./legacy-row";

export function sendLegacyJson(response: Response, payload: unknown, httpStatus = 200): void {
  response.status(httpStatus);
  response.setHeader("Content-Type", "application/json");
  response.send(JSON.stringify(payload, (_key, value) => stringifyLegacyValue(value)));
}
