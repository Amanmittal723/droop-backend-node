/**
 * Purpose: Verify that the health endpoint reports Node and PostgreSQL status.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Health JSON payload with status, timestamp, and checks fields.
 */
import request from "supertest";
import { createApp } from "../../src/app";

describe("GET /categories/health", () => {
  it("returns the Node health response shape", async () => {
    const app = createApp({
      prismaClient: {
        $queryRaw: jest.fn().mockResolvedValue([{ server_version: "PostgreSQL test" }])
      } as never
    });

    const response = await request(app).get("/categories/health");

    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty("status");
    expect(response.body).toHaveProperty("timestamp");
    expect(response.body).toHaveProperty("checks");
    expect(response.body.checks.app).toMatchObject({
      status: "ok",
      message: "Node backend is reachable",
      runtime: "node"
    });
    expect(response.body.checks.app).toHaveProperty("node_version");
    expect(response.body.checks.database).toMatchObject({
      engine: "postgresql"
    });
    expect(response.body.checks.dependencies).toHaveProperty("node_modules");
    expect(response.body.checks.dependencies).not.toHaveProperty("composer_autoload");
  });

  it("keeps the root and /categories aliases in sync for health", async () => {
    const app = createApp({
      prismaClient: {
        $queryRaw: jest.fn().mockResolvedValue([{ server_version: "PostgreSQL test" }])
      } as never
    });

    const [rootResponse, categoriesResponse] = await Promise.all([
      request(app).get("/health"),
      request(app).get("/categories/health")
    ]);

    expect(rootResponse.status).toBe(categoriesResponse.status);
    expect(rootResponse.body.status).toBe(categoriesResponse.body.status);
    expect(rootResponse.body.checks).toEqual(categoriesResponse.body.checks);
  });
});
