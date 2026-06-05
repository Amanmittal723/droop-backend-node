"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
/**
 * Purpose: Recreate the legacy health.php endpoint structure while checking the Node runtime and PostgreSQL dependencies.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: JSON object with status, timestamp, and checks keys matching the legacy PHP shape.
 */
const node_fs_1 = __importDefault(require("node:fs"));
const env_1 = require("../config/env");
const storage_1 = require("../lib/storage");
class HealthController {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    index = async (_request, response) => {
        const checks = {};
        let overallStatus = "ok";
        let httpCode = 200;
        checks.app = {
            status: "ok",
            message: "PHP backend is reachable",
            php_version: process.version
        };
        try {
            const result = await this.dependencies.prismaClient.$queryRaw `
        SELECT version() as server_version
      `;
            checks.database = {
                status: "ok",
                host: "postgresql",
                database: env_1.env.DATABASE_URL,
                server_info: result[0]?.server_version ?? "unknown"
            };
        }
        catch (error) {
            overallStatus = "degraded";
            httpCode = 503;
            checks.database = {
                status: "fail",
                hosts_tried: ["postgresql"],
                database: env_1.env.DATABASE_URL,
                message: error instanceof Error ? error.message : "Database connection failed"
            };
        }
        const storageChecks = {
            profile_uploads: (0, storage_1.legacyStorageDiskPath)("profile"),
            dual_posts: (0, storage_1.legacyStorageDiskPath)("dualPosts"),
            venture_uploads: (0, storage_1.legacyStorageDiskPath)("venture"),
            local_thumbnails: env_1.env.legacyThumbnailsRoot,
            local_video_posts: env_1.env.legacyVideoPostsRoot
        };
        let storageStatus = "ok";
        const storageResults = {};
        for (const [name, location] of Object.entries(storageChecks)) {
            const exists = node_fs_1.default.existsSync(location);
            let writable = false;
            if (exists) {
                try {
                    node_fs_1.default.accessSync(location, node_fs_1.default.constants.W_OK);
                    writable = true;
                }
                catch {
                    writable = false;
                }
            }
            const status = !exists ? "fail" : writable ? "ok" : "warn";
            storageResults[name] = exists
                ? { status, path: location, writable }
                : { status, path: location, message: "Path does not exist" };
            if (status === "fail") {
                storageStatus = "fail";
            }
            else if (status === "warn" && storageStatus === "ok") {
                storageStatus = "warn";
            }
        }
        if (storageStatus === "fail" && overallStatus === "ok") {
            overallStatus = "degraded";
            httpCode = 503;
        }
        checks.storage = {
            status: storageStatus,
            paths: storageResults
        };
        checks.dependencies = {
            status: node_fs_1.default.existsSync("node_modules") ? "ok" : "warn",
            composer_autoload: node_fs_1.default.existsSync("node_modules"),
            stripe_sdk: node_fs_1.default.existsSync("node_modules/stripe")
        };
        response.status(httpCode).json({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            checks
        });
    };
}
exports.HealthController = HealthController;
