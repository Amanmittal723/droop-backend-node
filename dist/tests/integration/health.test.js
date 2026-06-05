"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Purpose: Verify that the migrated health endpoint preserves the legacy response shape.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Legacy health.php JSON payload with status, timestamp, and checks fields.
 */
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
describe("GET /categories/health.php", () => {
    it("returns the legacy health response shape", async () => {
        const app = (0, app_1.createApp)({
            prismaClient: {
                $queryRaw: jest.fn().mockResolvedValue([{ server_version: "PostgreSQL test" }])
            }
        });
        const response = await (0, supertest_1.default)(app).get("/categories/health.php");
        expect([200, 503]).toContain(response.status);
        expect(response.body).toHaveProperty("status");
        expect(response.body).toHaveProperty("timestamp");
        expect(response.body).toHaveProperty("checks");
    });
});
