/**
 * Purpose: Verify that the migrated auth endpoints preserve key legacy compatibility behaviors.
 * Expected request body: Legacy signup and login fields.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status and message keys matching PHP.
 */
import request from "supertest";
import { createApp } from "../../src/app";
import { StripeService } from "../../src/services/stripe-service";

const stripeService = {
  createCustomer: jest.fn().mockResolvedValue({ status: "0", message: "Stripe is not configured", data: {} }),
  connectUrl: jest.fn().mockReturnValue("http://localhost:3001/categories/stripe_connect?user_id=1")
} as unknown as StripeService;

describe("auth compatibility endpoints", () => {
  it("returns the legacy signup validation error when username is blank", async () => {
    const prismaClient = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/categories/signup").send({
      name: "Test User",
      email: "test@example.com",
      pass: "secret",
      username: "   ",
      device_token: "device",
      device_type: "ios",
      profile_pic: Buffer.from("hello").toString("base64")
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "2",
      message: "Username is required."
    });
  });

  it("returns the legacy invalid password payload on the root login route", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          user_id: 1,
          user_name: "existing",
          user_pass: "correct-password"
        }
      ])
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/login").send({
      username: "existing",
      password: "wrong-password",
      device_token: "abcdefghijklmnop",
      device_type: "ios"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "Invalid username or password"
    });
  });

  it("keeps /categories/login wired to the legacy login behavior", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          user_id: 1,
          user_name: "existing",
          user_pass: "correct-password"
        }
      ])
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/categories/login").send({
      username: "existing",
      password: "wrong-password",
      device_token: "abcdefghijklmnop",
      device_type: "ios"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "Invalid username or password"
    });
  });

  it("keeps login_test wired to the legacy login behavior", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          user_id: 1,
          user_name: "existing",
          user_pass: "correct-password"
        }
      ])
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/login_test").send({
      username: "existing",
      password: "wrong-password",
      device_token: "abcdefghijklmnop",
      device_type: "ios"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "Invalid username or password"
    });
  });
});
