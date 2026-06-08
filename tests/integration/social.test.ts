/**
 * Purpose: Verify that migrated social and notification maintenance endpoints preserve key legacy compatibility payloads.
 * Expected request body: Legacy ids and flags like followed_by, user_id, old_password, and notification_id.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status and message values from the PHP scripts.
 */
import request from "supertest";
import { createApp } from "../../src/app";

describe("social compatibility endpoints", () => {
  it("returns the legacy invalid-request payload for follow_user", async () => {
    const app = createApp({ prismaClient: {} as never });
    const response = await request(app).post("/categories/follow_user").send({
      followed_by: "",
      following_id: "2",
      user_name: "Aryan",
      isDelete: "NO"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "Invalid Request"
    });
  });

  it("returns the legacy old-password-required payload", async () => {
    const app = createApp({ prismaClient: {} as never });
    const response = await request(app).post("/categories/change_pass").send({
      user_id: "1",
      new_password: "next"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "Old password required"
    });
  });

  it("stringifies suggested video feed values like the legacy PHP backend", async () => {
    const prismaClient = {
      $queryRawUnsafe: jest
        .fn()
        .mockResolvedValueOnce([{ following_id: 3 }])
        .mockResolvedValueOnce([
          {
            dual_id: 7,
            dual_posted_by: 2,
            dual_caption: "Demo",
            dual_type: 2,
            is_reported: "NO",
            is_loved: true,
            video_price: 0,
            image_price: 0,
            story_price: 0,
            is_free_promo: 0,
            user_type: 1
          }
        ])
    } as never;

    const app = createApp({ prismaClient });
    const response = await request(app).post("/categories/getSuggestedVideos").send({ user_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "1",
      message: "Videos Found successfully",
      data: [
        {
          dual_id: "7",
          dual_posted_by: "2",
          dual_caption: "Demo",
          dual_type: "2",
          is_reported: "NO",
          is_loved: "1",
          video_price: "0",
          image_price: "0",
          story_price: "0",
          is_free_promo: "0",
          user_type: "1"
        }
      ]
    });
  });
});
