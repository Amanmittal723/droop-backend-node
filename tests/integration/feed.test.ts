/**
 * Purpose: Verify home feed endpoints include posts from followed users.
 */
import request from "supertest";
import { createApp } from "../../src/app";

describe("feed compatibility endpoints", () => {
  it("returns followed users' posts from getDuals4", async () => {
    const queryRawUnsafe = jest
      .fn()
      .mockResolvedValueOnce([{ following_id: "3" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          dual_id: 42,
          dual_posted_by: "3",
          dual_linked_to: -1,
          dual_caption: "Hello from test3",
          is_reported: "NO",
          is_loved: false,
          is_saved: false
        }
      ])
      .mockResolvedValueOnce([{ total: 1 }]);
    const prismaClient = {
      $queryRawUnsafe: queryRawUnsafe
    } as never;

    const app = createApp({ prismaClient });
    const response = await request(app).post("/categories/getDuals4").send({
      user_id: "1",
      start: "0",
      page_size: "10",
      random: "0"
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("1");
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].dual_posted_by).toBe("3");

    const feedQuery = String(queryRawUnsafe.mock.calls[3][0]);
    expect(feedQuery).toContain("dual_posted_by IN ('3')");
    expect(String(queryRawUnsafe.mock.calls[0][0])).toContain("followers_master");
  });
});
