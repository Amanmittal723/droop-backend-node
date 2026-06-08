"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Purpose: Verify that the migrated preference selection endpoints preserve legacy validation and success payloads.
 * Expected request body: user_id plus comma-separated category_ids, interest_ids, or business_ids.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status and message values from the PHP scripts.
 */
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
describe("preference compatibility endpoints", () => {
    it("returns the legacy missing-data response for category selection", async () => {
        const app = (0, app_1.createApp)({ prismaClient: {} });
        const response = await (0, supertest_1.default)(app).post("/categories/selectUserCategory").send({});
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
        };
        const app = (0, app_1.createApp)({ prismaClient });
        const response = await (0, supertest_1.default)(app).post("/categories/selectUserBusiness").send({
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
