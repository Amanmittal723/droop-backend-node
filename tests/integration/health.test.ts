/**
 * Purpose: Verify that the migrated health endpoint preserves the legacy response shape.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Legacy health.php JSON payload with status, timestamp, and checks fields.
 */
import request from "supertest";
import { createApp } from "../../src/app";

describe("GET /categories/health.php", () => {
  it("returns the legacy health response shape", async () => {
    const app = createApp({
      prismaClient: {
        $queryRaw: jest.fn().mockResolvedValue([{ server_version: "PostgreSQL test" }])
      } as never
    });

    const response = await request(app).get("/categories/health.php");

    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty("status");
    expect(response.body).toHaveProperty("timestamp");
    expect(response.body).toHaveProperty("checks");
  });
});
