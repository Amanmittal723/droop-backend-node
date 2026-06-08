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

  it("keeps the root and /categories aliases in sync for health.php", async () => {
    const app = createApp({
      prismaClient: {
        $queryRaw: jest.fn().mockResolvedValue([{ server_version: "PostgreSQL test" }])
      } as never
    });

    const [rootResponse, categoriesResponse] = await Promise.all([
      request(app).get("/health.php"),
      request(app).get("/categories/health.php")
    ]);

    expect(rootResponse.status).toBe(categoriesResponse.status);
    expect(rootResponse.body.status).toBe(categoriesResponse.body.status);
    expect(rootResponse.body.checks).toEqual(categoriesResponse.body.checks);
  });
});
