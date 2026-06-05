/**
 * Purpose: Start the Express server for the Droop compatibility backend.
 * Expected request body: Delegated to mounted route handlers.
 * Expected query parameters: Delegated to mounted route handlers.
 * Expected headers: Delegated to mounted route handlers.
 * Expected response structure: Standard HTTP server startup and runtime responses from the mounted routes.
 */
import { createApp } from "./app";
import { env } from "./config/env";
import { ensureRuntimeDirectories } from "./lib/storage";
import { logger } from "./lib/logger";

async function start(): Promise<void> {
  await ensureRuntimeDirectories();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Droop compatibility backend listening");
  });
}

void start();
