"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Purpose: Verify that the migrated message endpoints preserve the legacy empty-state response shapes.
 * Expected request body: user_id and friend_id for getmessages; user_id for thread endpoints.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status, message, and userD keys where applicable.
 */
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
describe("message compatibility endpoints", () => {
    it("returns the legacy no-thread response for getmessages.php", async () => {
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
        };
        const app = (0, app_1.createApp)({ prismaClient });
        const response = await (0, supertest_1.default)(app).post("/categories/getmessages.php").send({
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
