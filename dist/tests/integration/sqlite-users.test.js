"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Purpose: Verify that sqlite_users still queries the legacy SQLite database instead of returning a stub.
 * Expected request body: None.
 * Expected query parameters: username, limit, and include_hash.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payload with queried users and returned_count.
 */
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
describe("sqlite_users compatibility endpoint", () => {
    it("returns queried users from the configured SQLite database", async () => {
        const tempDirectory = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), "droop-sqlite-users-"));
        const databasePath = node_path_1.default.join(tempDirectory, "storage.sqlite");
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
            const app = (0, app_1.createApp)({ prismaClient: {} });
            const response = await (0, supertest_1.default)(app)
                .get("/categories/sqlite_users")
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
        }
        finally {
            if (originalSqlitePath === undefined) {
                delete process.env.DROOP_SQLITE_PATH;
            }
            else {
                process.env.DROOP_SQLITE_PATH = originalSqlitePath;
            }
            await promises_1.default.rm(tempDirectory, { recursive: true, force: true });
        }
    });
});
