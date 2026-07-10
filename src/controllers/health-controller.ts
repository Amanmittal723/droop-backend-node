/**
 * Purpose: Report Node runtime and PostgreSQL health for the migrated backend.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: JSON object with status, timestamp, and checks for app, database, storage, and dependencies.
 */
import fs from "node:fs";
import path from "node:path";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { legacyStorageDiskPath } from "../lib/storage";

type HealthControllerDependencies = {
  prismaClient: PrismaClient;
};

type CheckStatus = "ok" | "warn" | "fail";

function readPackageInfo(): { name: string; version: string } {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { name?: string; version?: string };
    return {
      name: parsed.name ?? "droop-backend-node",
      version: parsed.version ?? "unknown"
    };
  } catch {
    return { name: "droop-backend-node", version: "unknown" };
  }
}

function databaseHost(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).host || "postgresql";
  } catch {
    return "postgresql";
  }
}

export class HealthController {
  public constructor(private readonly dependencies: HealthControllerDependencies) {}

  public index = async (_request: Request, response: Response): Promise<void> => {
    const checks: Record<string, unknown> = {};
    let overallStatus = "ok";
    let httpCode = 200;

    const packageInfo = readPackageInfo();
    checks.app = {
      status: "ok",
      message: "Node backend is reachable",
      runtime: "node",
      node_version: process.version,
      name: packageInfo.name,
      version: packageInfo.version
    };

    try {
      const result = await this.dependencies.prismaClient.$queryRaw<{ server_version: string }[]>`
        SELECT version() as server_version
      `;
      checks.database = {
        status: "ok",
        engine: "postgresql",
        host: databaseHost(env.DATABASE_URL),
        server_info: result[0]?.server_version ?? "unknown"
      };
    } catch (error) {
      overallStatus = "degraded";
      httpCode = 503;
      checks.database = {
        status: "fail",
        engine: "postgresql",
        host: databaseHost(env.DATABASE_URL),
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

    const nodeModulesPresent = fs.existsSync("node_modules");
    checks.dependencies = {
      status: nodeModulesPresent ? "ok" : "warn",
      node_modules: nodeModulesPresent,
      prisma_client: fs.existsSync("node_modules/@prisma/client"),
      stripe_sdk: fs.existsSync("node_modules/stripe")
    };

    response.status(httpCode).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks
    });
  };
}
