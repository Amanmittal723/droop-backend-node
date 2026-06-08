/**
 * Purpose: Verify that the migrated password recovery endpoint preserves the legacy request validation and success payload.
 * Expected request body: email.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payload with status and message values from forgot_pass.
 */
import request from "supertest";
import { createApp } from "../../src/app";

describe("forgot_pass compatibility endpoint", () => {
  it("returns the legacy missing-email response", async () => {
    const app = createApp({ prismaClient: {} as never });
    const response = await request(app).post("/categories/forgot_pass").send({});
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "Email required"
    });
  });

  it("returns the legacy success response when recovery mail is sent", async () => {
    const prismaClient = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([
          {
            user_email: "jane@example.com",
            user_name: "jane",
            user_pass: "plain-pass"
          }
        ])
    } as never;
    const mailService = {
      sendRecoveryMail: jest.fn().mockResolvedValue(true)
    } as never;

    const app = createApp({ prismaClient, mailService });
    const response = await request(app).post("/categories/forgot_pass").send({ email: "jane@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "1",
      message: "Recovery Mail sent successfully"
    });
  });
});
