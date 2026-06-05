"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Purpose: Start the Express server for the Droop compatibility backend.
 * Expected request body: Delegated to mounted route handlers.
 * Expected query parameters: Delegated to mounted route handlers.
 * Expected headers: Delegated to mounted route handlers.
 * Expected response structure: Standard HTTP server startup and runtime responses from the mounted routes.
 */
const app_1 = require("./app");
const env_1 = require("./config/env");
const storage_1 = require("./lib/storage");
const logger_1 = require("./lib/logger");
async function start() {
    await (0, storage_1.ensureRuntimeDirectories)();
    const app = (0, app_1.createApp)();
    app.listen(env_1.env.PORT, () => {
        logger_1.logger.info({ port: env_1.env.PORT }, "Droop compatibility backend listening");
    });
}
void start();
