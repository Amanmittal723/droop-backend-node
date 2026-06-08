"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Purpose: Verify that the migrated auth endpoints preserve key legacy compatibility behaviors.
 * Expected request body: Legacy signup and login fields.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status and message keys matching PHP.
 */
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
const stripeService = {
    createCustomer: jest.fn().mockResolvedValue({ status: "0", message: "Stripe is not configured", data: {} }),
    connectUrl: jest.fn().mockReturnValue("http://localhost:3001/categories/stripe_connect?user_id=1")
};
describe("auth compatibility endpoints", () => {
    it("returns the legacy signup validation error when username is blank", async () => {
        const prismaClient = {
            $queryRaw: jest
                .fn()
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
        };
        const app = (0, app_1.createApp)({ prismaClient, stripeService });
        const response = await (0, supertest_1.default)(app).post("/categories/signup").send({
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
        };
        const app = (0, app_1.createApp)({ prismaClient, stripeService });
        const response = await (0, supertest_1.default)(app).post("/login").send({
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
        };
        const app = (0, app_1.createApp)({ prismaClient, stripeService });
        const response = await (0, supertest_1.default)(app).post("/categories/login").send({
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
        };
        const app = (0, app_1.createApp)({ prismaClient, stripeService });
        const response = await (0, supertest_1.default)(app).post("/login_test").send({
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
