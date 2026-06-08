/**
 * Purpose: Verify that the migrated message endpoints preserve the legacy empty-state response shapes.
 * Expected request body: user_id and friend_id for getmessages; user_id for thread endpoints.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status, message, and userD keys where applicable.
 */
import request from "supertest";
import { createApp } from "../../src/app";

describe("message compatibility endpoints", () => {
  it("returns the legacy no-thread response for getmessages", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValueOnce([
        {
          user_id: "2",
          user_pic: "pic.png",
          user_full_name: "Friend User",
          user_name: "friend"
        }
      ]),
      $queryRawUnsafe: jest.fn().mockResolvedValueOnce([])
    } as never;

    const app = createApp({ prismaClient });
    const response = await request(app).post("/categories/getmessages").send({
      user_id: "1",
      friend_id: "2"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "No threads found",
      userD: {
        user_id: "2",
        user_pic: "pic.png",
        user_full_name: "Friend User",
        user_name: "friend"
      }
    });
  });
});
