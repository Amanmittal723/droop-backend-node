/**
 * Purpose: Provide a shared Pino logger for API requests and migration diagnostics.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Shared logger instance.
 */
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "test" ? "silent" : "info"
});
