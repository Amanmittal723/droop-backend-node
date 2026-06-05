"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyStorageDiskPath = legacyStorageDiskPath;
exports.legacyStoragePublicUrl = legacyStoragePublicUrl;
exports.ensureRuntimeDirectories = ensureRuntimeDirectories;
exports.writeBase64File = writeBase64File;
/**
 * Purpose: Recreate legacy file storage paths and public URLs used by the PHP backend.
 * Expected request body: Base64 strings or multipart files handled by callers.
 * Expected query parameters: None.
 * Expected headers: Host and protocol headers are used to build public URLs when needed.
 * Expected response structure: File path and public URL helpers matching PHP path conventions.
 */
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const env_1 = require("../config/env");
function legacyStorageDiskPath(directory, filename = "") {
    const target = node_path_1.default.join(env_1.env.legacyStorageRoot, directory);
    return filename ? node_path_1.default.join(target, filename) : target;
}
function legacyStoragePublicUrl(request, directory, filename = "") {
    const host = request.headers.host;
    const scheme = request.secure ? "https" : "http";
    const prefix = host ? `${scheme}://${host}` : env_1.env.LEGACY_STORAGE_BASE_URL.replace(/\/storage$/, "");
    const suffix = filename ? `/storage/${directory}/${filename}` : `/storage/${directory}`;
    return `${prefix}${suffix}`;
}
async function ensureRuntimeDirectories() {
    const directories = [
        env_1.env.legacyStorageRoot,
        legacyStorageDiskPath("profile"),
        legacyStorageDiskPath("dualPosts"),
        legacyStorageDiskPath("venture"),
        env_1.env.legacyThumbnailsRoot,
        env_1.env.legacyVideoPostsRoot
    ];
    await Promise.all(directories.map((directory) => promises_1.default.mkdir(directory, { recursive: true })));
}
async function writeBase64File(filePath, encoded) {
    const buffer = Buffer.from(encoded, "base64");
    await promises_1.default.writeFile(filePath, buffer);
}
