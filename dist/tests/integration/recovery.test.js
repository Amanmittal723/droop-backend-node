"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Purpose: Verify that the migrated password recovery endpoint preserves the legacy request validation and success payload.
 * Expected request body: email (username or registered email address).
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payload with status and message values from forgot_pass.
 */
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
describe("forgot_pass compatibility endpoint", () => {
    it("returns the legacy missing-email response", async () => {
        const app = (0, app_1.createApp)({ prismaClient: {} });
        const response = await (0, supertest_1.default)(app).post("/categories/forgot_pass").send({});
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: "0",
            message: "Email required"
        });
    });
    it("returns the legacy invalid-email response", async () => {
        const app = (0, app_1.createApp)({ prismaClient: {} });
        const response = await (0, supertest_1.default)(app).post("/forgot_pass").send({ email: "not-an-email@" });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: "0",
            message: "Please enter a valid email address."
        });
    });
    it("returns the legacy not-registered response", async () => {
        const prismaClient = {
            $queryRaw: jest.fn().mockResolvedValueOnce([])
        };
        const app = (0, app_1.createApp)({ prismaClient });
        const response = await (0, supertest_1.default)(app).post("/forgot_pass").send({ email: "missing@example.com" });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: "0",
            message: "Email is not registered with droop"
        });
    });
    it("returns the legacy success response when recovery mail is sent by email", async () => {
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
        };
        const sendRecoveryMail = jest.fn().mockResolvedValue(true);
        const mailService = {
            sendRecoveryMail
        };
        const app = (0, app_1.createApp)({ prismaClient, mailService });
        const response = await (0, supertest_1.default)(app).post("/categories/forgot_pass").send({ email: "jane@example.com" });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: "1",
            message: "Recovery Mail sent successfully"
        });
        expect(sendRecoveryMail).toHaveBeenCalledWith("jane@example.com", "jane", "Droop - Account Recovery", expect.stringContaining("plain-pass"));
    });
    it("returns the legacy success response when recovery mail is sent by username", async () => {
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
        };
        const mailService = {
            sendRecoveryMail: jest.fn().mockResolvedValue(true)
        };
        const app = (0, app_1.createApp)({ prismaClient, mailService });
        const response = await (0, supertest_1.default)(app).post("/forgot_pass").send({ email: "jane" });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: "1",
            message: "Recovery Mail sent successfully"
        });
    });
    it("normalizes registered email addresses before lookup", async () => {
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
        };
        const mailService = {
            sendRecoveryMail: jest.fn().mockResolvedValue(true)
        };
        const app = (0, app_1.createApp)({ prismaClient, mailService });
        const response = await (0, supertest_1.default)(app).post("/forgot_pass").send({ email: "  Jane@Example.COM  " });
        expect(response.status).toBe(200);
        expect(response.body.status).toBe("1");
    });
    it("returns the legacy failure response when recovery mail cannot be sent", async () => {
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
        };
        const mailService = {
            sendRecoveryMail: jest.fn().mockResolvedValue(false)
        };
        const app = (0, app_1.createApp)({ prismaClient, mailService });
        const response = await (0, supertest_1.default)(app).post("/forgot_pass").send({ email: "jane@example.com" });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: "0",
            message: "Failed to send an email"
        });
    });
});
