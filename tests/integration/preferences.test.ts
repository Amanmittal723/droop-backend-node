/**
 * Purpose: Verify that the migrated preference selection endpoints preserve legacy validation and success payloads.
 * Expected request body: user_id plus comma-separated category_ids, interest_ids, or business_ids.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status and message values from the PHP scripts.
 */
import request from "supertest";
import { createApp } from "../../src/app";

describe("preference compatibility endpoints", () => {
  it("returns the legacy missing-data response for category selection", async () => {
    const app = createApp({ prismaClient: {} as never });
    const response = await request(app).post("/categories/selectUserCategory.php").send({});
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "Data required to process request"
    });
  });

  it("returns the legacy success response for business selection", async () => {
    const prismaClient = {
      $transaction: jest.fn().mockResolvedValue([]),
      $executeRaw: jest.fn(),
      $executeRawUnsafe: jest.fn()
    } as never;

    const app = createApp({ prismaClient });
    const response = await request(app).post("/categories/selectUserBusiness.php").send({
      user_id: "1",
      business_ids: "2,3"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "1",
      message: "Business added Successfully"
    });
  });
});
