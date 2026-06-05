/**
 * Purpose: Wrap async Express handlers and forward errors consistently.
 * Expected request body: Handler-specific.
 * Expected query parameters: Handler-specific.
 * Expected headers: Handler-specific.
 * Expected response structure: Delegates to the wrapped handler or forwards errors.
 */
import { NextFunction, Request, RequestHandler, Response } from "express";

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}
