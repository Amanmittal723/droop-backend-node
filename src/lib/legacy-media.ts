/**
 * Purpose: Centralize legacy file lookup, URL building, and media persistence helpers.
 * Expected request body: Multipart uploads or base64 strings handled by callers.
 * Expected query parameters: None.
 * Expected headers: Host and protocol headers are used for legacy public URL generation.
 * Expected response structure: File handles, saved paths, and public URLs.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { Request } from "express";

export function getUploadedFile(request: Request, fieldName: string): Express.Multer.File | undefined {
  return (request.files as Express.Multer.File[] | undefined)?.find((file) => file.fieldname === fieldName);
}

export function buildLegacyRouteAssetUrl(request: Request, directory: string, fileName: string): string {
  const protocol = request.secure ? "https" : "http";
  const host = request.headers.host ?? "localhost:3000";
  return `${protocol}://${host}/categories/${directory}/${fileName}`;
}

export async function saveUploadedBuffer(directory: string, fileName: string, buffer: Buffer): Promise<string> {
  await fs.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, fileName);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function saveBase64Buffer(directory: string, fileName: string, encoded: string): Promise<string> {
  await fs.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, fileName);
  await fs.writeFile(filePath, Buffer.from(encoded, "base64"));
  return filePath;
}

export async function deleteAssetIfPresent(directory: string, assetUrl: string): Promise<void> {
  if (!assetUrl) {
    return;
  }
  await fs.rm(path.join(directory, path.basename(assetUrl)), { force: true });
}
