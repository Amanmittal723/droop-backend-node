/**
 * Purpose: Verify that the migrated story endpoints preserve the legacy validation and empty-state payloads.
 * Expected request body: user_id and story_id for deleteStory; user_id for getStories.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status and message values from the PHP scripts.
 */
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";
import { createApp } from "../../src/app";

describe("story compatibility endpoints", () => {
  it("returns the legacy invalid-request response for deleteStory", async () => {
    const app = createApp({ prismaClient: {} as never });
    const response = await request(app).post("/categories/deleteStory").send({ user_id: "1" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "Invalid Request"
    });
  });

  it("returns the legacy no-story response for getStories", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]),
      $queryRawUnsafe: jest.fn().mockResolvedValueOnce([])
    } as never;

    const app = createApp({ prismaClient });
    const response = await request(app).post("/categories/getStories").send({ user_id: "1" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "No story found"
    });
  });

  it("stringifies numeric story fields like the legacy PHP backend", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]),
      $queryRawUnsafe: jest.fn().mockResolvedValueOnce([
        {
          story_id: 7,
          story_posted_by: 2,
          story_type: 1,
          is_reported: 0,
          user_pic: "/storage/profile/demo2.jpg",
          user_name: "demotwo",
          date_time: new Date("2026-06-05T10:00:00Z")
        }
      ])
    } as never;

    const app = createApp({ prismaClient });
    const response = await request(app).post("/categories/getStories").send({ user_id: "2" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "1",
      message: "Story Found successfully",
      data: [
        {
          story_posted_by: "2",
          user_pic: "/storage/profile/demo2.jpg",
          user_name: "demotwo",
          stories: [
            {
              story_id: "7",
              story_posted_by: "2",
              story_type: "1",
              is_reported: "0",
              user_pic: "/storage/profile/demo2.jpg",
              user_name: "demotwo",
              date_time: "2026-06-05 10:00:00"
            }
          ]
        }
      ]
    });
  });

  it("accepts a large multipart text field on addStory without Multer rejecting it", async () => {
    const prismaClient = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          {
            user_id: 2,
            user_name: "demotwo"
          }
        ])
        .mockResolvedValueOnce([
          {
            story_id: 7,
            story_image: "http://localhost:3000/categories/storyPost/demo.jpg",
            story_posted_by: 2,
            story_video: "",
            story_type: 1,
            story_date: "2026-06-05",
            story_time: "10:00:00",
            date_time: "2026-06-05 10:00:00"
          }
        ])
    } as never;

    const app = createApp({ prismaClient });
    const response = await request(app)
      .post("/addStory")
      .field("user_id", "2")
      .field("story_type", "1")
      .field("story_date", "2026-06-05")
      .field("story_time", "10:00:00")
      .field("dual_pic", "a".repeat(2 * 1024 * 1024))
      .attach("story_image", Buffer.from("hello"), "story.jpg");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("1");
    expect(response.body.message).toBe("Story Created Successfully");
  });

  it("writes uploaded story media into the test storage root instead of repo-tracked folders", async () => {
    const prismaClient = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          {
            user_id: 2,
            user_name: "demotwo"
          }
        ])
        .mockResolvedValueOnce([
          {
            story_id: 9,
            story_image: "http://localhost:3000/categories/storyPost/uploaded-story.jpg",
            story_posted_by: 2,
            story_video: "",
            story_type: 1,
            story_date: "2026-06-05",
            story_time: "10:00:00",
            date_time: "2026-06-05 10:00:00"
          }
        ])
    } as never;

    const storyDirectory = path.join(process.env.LEGACY_STORAGE_ROOT as string, "storyPost");
    await fs.rm(storyDirectory, { recursive: true, force: true });

    const app = createApp({ prismaClient });
    const response = await request(app)
      .post("/addStory")
      .field("user_id", "2")
      .field("story_type", "1")
      .field("story_date", "2026-06-05")
      .field("story_time", "10:00:00")
      .attach("story_image", Buffer.from("hello"), "story.jpg");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("1");

    const files = await fs.readdir(storyDirectory);
    expect(files.length).toBeGreaterThan(0);
    expect(storyDirectory.startsWith("/private/tmp/")).toBe(true);
  });
});
