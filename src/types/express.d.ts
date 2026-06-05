/**
 * Purpose: Extend Express request typing with the merged legacy PHP-style request payload.
 * Expected request body: Any parsed legacy endpoint body fields.
 * Expected query parameters: Any parsed legacy endpoint query fields.
 * Expected headers: Standard Express request headers.
 * Expected response structure: Type augmentation only.
 */
import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    legacyInput?: Record<string, unknown>;
  }
}
