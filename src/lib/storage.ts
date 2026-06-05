/**
 * Purpose: Recreate legacy file storage paths and public URLs used by the PHP backend.
 * Expected request body: Base64 strings or multipart files handled by callers.
 * Expected query parameters: None.
 * Expected headers: Host and protocol headers are used to build public URLs when needed.
 * Expected response structure: File path and public URL helpers matching PHP path conventions.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { Request } from "express";
import { env } from "../config/env";

export function legacyStorageDiskPath(directory: string, filename = ""): string {
  const target = path.join(env.legacyStorageRoot, directory);
  return filename ? path.join(target, filename) : target;
}

export function legacyStoragePublicUrl(request: Request, directory: string, filename = ""): string {
  const host = request.headers.host;
  const scheme = request.secure ? "https" : "http";
  const prefix = host ? `${scheme}://${host}` : env.LEGACY_STORAGE_BASE_URL.replace(/\/storage$/, "");
  const suffix = filename ? `/storage/${directory}/${filename}` : `/storage/${directory}`;
  return `${prefix}${suffix}`;
}

export async function ensureRuntimeDirectories(): Promise<void> {
  const directories = [
    env.legacyStorageRoot,
    legacyStorageDiskPath("profile"),
    legacyStorageDiskPath("dualPosts"),
    legacyStorageDiskPath("venture"),
    env.legacyThumbnailsRoot,
    env.legacyVideoPostsRoot
  ];

  await Promise.all(directories.map((directory) => fs.mkdir(directory, { recursive: true })));
}

export async function writeBase64File(filePath: string, encoded: string): Promise<void> {
  const buffer = Buffer.from(encoded, "base64");
  await fs.writeFile(filePath, buffer);
}
