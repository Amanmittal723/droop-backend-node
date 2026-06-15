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
  it("returns available when email address is not registered", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValueOnce([])
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/check_email").send({
      email: "newuser@example.com"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "1",
      message: "Email address is available."
    });
  });

  it("returns conflict when email address is already registered", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValueOnce([{ user_id: 1, user_email: "existing@example.com" }])
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/categories/check_email").send({
      email: "existing@example.com"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "2",
      message: "This Email Address is already registered with us."
    });
  });

  it("returns available when username is not taken", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValueOnce([])
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/check_username").send({
      username: "new_user"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "1",
      message: "Username is available."
    });
  });

  it("returns conflict when username is already taken", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValueOnce([{ user_id: 1, user_name: "existing" }])
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/check_username").send({
      username: "existing"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "3",
      message: "This username is already taken."
    });
  });

  it("creates an email signup account and returns the legacy success payload", async () => {
    const prismaClient = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ user_id: 9 }])
        .mockResolvedValueOnce([
          {
            user_id: 9,
            user_name: "new_user",
            user_email: "newuser@example.com"
          }
        ])
        .mockResolvedValue([])
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/signup_email").send({
      email: "newuser@example.com",
      username: "new_user",
      pass: "secret123",
      device_token: "abcdefghijklmnop",
      device_type: "iOS"
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("1");
    expect(response.body.message).toBe("User Signup Successfully");
    expect(response.body.data.user_id).toBe("9");
    expect(response.body.data.user_name).toBe("new_user");
  });

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

  it("logs in with email and password", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockImplementation(() =>
        Promise.resolve([
          {
            user_id: 9,
            user_name: "new_user",
            user_email: "newuser@example.com",
            user_pass: "secret123"
          }
        ])
      ),
      $executeRaw: jest.fn().mockResolvedValue(1)
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/login").send({
      email: "newuser@example.com",
      password: "secret123",
      device_token: "abcdefghijklmnop",
      device_type: "iOS"
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("1");
    expect(response.body.message).toBe("Logged in successfully");
    expect(response.body.data.user_id).toBe("9");
  });

  it("logs in when the email is sent in the legacy username field", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockImplementation(() =>
        Promise.resolve([
          {
            user_id: 9,
            user_name: "new_user",
            user_email: "newuser@example.com",
            user_pass: "secret123"
          }
        ])
      ),
      $executeRaw: jest.fn().mockResolvedValue(1)
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/categories/login").send({
      username: "newuser@example.com",
      password: "secret123",
      device_token: "abcdefghijklmnop",
      device_type: "iOS"
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("1");
    expect(response.body.data.user_email).toBe("newuser@example.com");
  });

  it("returns email-specific invalid password message", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValueOnce([
        {
          user_id: 9,
          user_name: "new_user",
          user_email: "newuser@example.com",
          user_pass: "secret123"
        }
      ])
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/login").send({
      email: "newuser@example.com",
      password: "wrong-password",
      device_token: "abcdefghijklmnop",
      device_type: "iOS"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "Invalid email or password"
    });
  });

  it("keeps /categories/login wired to the legacy login behavior", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          user_id: 1,
          user_name: "existing",
          user_email: "existing@example.com",
          user_pass: "correct-password"
        }
      ])
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/categories/login").send({
      email: "existing@example.com",
      password: "wrong-password",
      device_token: "abcdefghijklmnop",
      device_type: "ios"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "Invalid email or password"
    });
  });

  it("keeps login_test wired to the legacy login behavior", async () => {
    const prismaClient = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          user_id: 1,
          user_name: "existing",
          user_email: "existing@example.com",
          user_pass: "correct-password"
        }
      ])
    } as never;

    const app = createApp({ prismaClient, stripeService });
    const response = await request(app).post("/login_test").send({
      email: "existing@example.com",
      password: "wrong-password",
      device_token: "abcdefghijklmnop",
      device_type: "ios"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "0",
      message: "Invalid email or password"
    });
  });
});
