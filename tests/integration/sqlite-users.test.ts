/**
 * Purpose: Verify that sqlite_users.php still queries the legacy SQLite database instead of returning a stub.
 * Expected request body: None.
 * Expected query parameters: username, limit, and include_hash.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payload with queried users and returned_count.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import request from "supertest";
import { createApp } from "../../src/app";

const execFileAsync = promisify(execFile);

describe("sqlite_users compatibility endpoint", () => {
  it("returns queried users from the configured SQLite database", async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "droop-sqlite-users-"));
    const databasePath = path.join(tempDirectory, "storage.sqlite");

    await execFileAsync("sqlite3", [
      databasePath,
      [
        "CREATE TABLE users (username TEXT, real_name TEXT, alternate_email TEXT, phone_number TEXT, domain TEXT, type TEXT, guid TEXT, avatar_url TEXT, digest_auth_hash TEXT, synced_password TEXT, has_invite INTEGER, invite_expiration TEXT, password_hash TEXT);",
        "INSERT INTO users(username, real_name, alternate_email, phone_number, domain, type, guid, avatar_url, digest_auth_hash, synced_password, has_invite, invite_expiration, password_hash)",
        "VALUES('jane', 'Jane Roe', 'jane@example.com', '1234567890', 'droopllc.com', 'user', 'guid-1', 'avatar.png', 'digest', 'plain', 1, '2026-06-05', '$2y$10$abcdefghijklmnopqrstuv');"
      ].join(" ")
    ]);

    const originalSqlitePath = process.env.DROOP_SQLITE_PATH;
    process.env.DROOP_SQLITE_PATH = databasePath;

    try {
      const app = createApp({ prismaClient: {} as never });
      const response = await request(app)
        .get("/categories/sqlite_users.php")
        .query({ username: "jane", include_hash: "0" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: "1",
        database_path: databasePath,
        requested_username: "jane",
        returned_count: "1"
      });
      expect(response.body.users).toEqual([
        expect.objectContaining({
          username: "jane",
          real_name: "Jane Roe",
          alternate_email: "jane@example.com"
        })
      ]);
      expect(response.body.users[0].password_hash).toBeUndefined();
    } finally {
      if (originalSqlitePath === undefined) {
        delete process.env.DROOP_SQLITE_PATH;
      } else {
        process.env.DROOP_SQLITE_PATH = originalSqlitePath;
      }
      await fs.rm(tempDirectory, { recursive: true, force: true });
    }
  });
});
