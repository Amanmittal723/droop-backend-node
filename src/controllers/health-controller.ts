/**
 * Purpose: Recreate the legacy health.php endpoint structure while checking the Node runtime and PostgreSQL dependencies.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: JSON object with status, timestamp, and checks keys matching the legacy PHP shape.
 */
import fs from "node:fs";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { legacyStorageDiskPath } from "../lib/storage";

type HealthControllerDependencies = {
  prismaClient: PrismaClient;
};

type CheckStatus = "ok" | "warn" | "fail";

export class HealthController {
  public constructor(private readonly dependencies: HealthControllerDependencies) {}

  public index = async (_request: Request, response: Response): Promise<void> => {
    const checks: Record<string, unknown> = {};
    let overallStatus = "ok";
    let httpCode = 200;

    checks.app = {
      status: "ok",
      message: "PHP backend is reachable",
      php_version: process.version
    };

    try {
      const result = await this.dependencies.prismaClient.$queryRaw<{ server_version: string }[]>`
        SELECT version() as server_version
      `;
      checks.database = {
        status: "ok",
        host: "postgresql",
        database: env.DATABASE_URL,
        server_info: result[0]?.server_version ?? "unknown"
      };
    } catch (error) {
      overallStatus = "degraded";
      httpCode = 503;
      checks.database = {
        status: "fail",
        hosts_tried: ["postgresql"],
        database: env.DATABASE_URL,
        message: error instanceof Error ? error.message : "Database connection failed"
      };
    }

    const storageChecks = {
      profile_uploads: legacyStorageDiskPath("profile"),
      dual_posts: legacyStorageDiskPath("dualPosts"),
      venture_uploads: legacyStorageDiskPath("venture"),
      local_thumbnails: env.legacyThumbnailsRoot,
      local_video_posts: env.legacyVideoPostsRoot
    };

    let storageStatus: CheckStatus = "ok";
    const storageResults: Record<string, unknown> = {};
    for (const [name, location] of Object.entries(storageChecks)) {
      const exists = fs.existsSync(location);
      let writable = false;
      if (exists) {
        try {
          fs.accessSync(location, fs.constants.W_OK);
          writable = true;
        } catch {
          writable = false;
        }
      }
      const status: CheckStatus = !exists ? "fail" : writable ? "ok" : "warn";
      storageResults[name] = exists
        ? { status, path: location, writable }
        : { status, path: location, message: "Path does not exist" };

      if (status === "fail") {
        storageStatus = "fail";
      } else if (status === "warn" && storageStatus === "ok") {
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
      status: fs.existsSync("node_modules") ? "ok" : "warn",
      composer_autoload: fs.existsSync("node_modules"),
      stripe_sdk: fs.existsSync("node_modules/stripe")
    };

    response.status(httpCode).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks
    });
  };
}
