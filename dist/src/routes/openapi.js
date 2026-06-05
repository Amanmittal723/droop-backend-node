"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenApiRouter = createOpenApiRouter;
/**
 * Purpose: Expose a minimal OpenAPI document and Swagger UI for the migrated compatibility routes.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: OpenAPI JSON or Swagger UI HTML.
 */
const express_1 = require("express");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const document = {
    openapi: "3.0.0",
    info: {
        title: "Droop Legacy Compatibility API",
        version: "0.1.0"
    },
    paths: {
        "/health.php": {
            get: {
                summary: "Compatibility health check",
                responses: {
                    "200": { description: "Legacy health response" }
                }
            }
        },
        "/login.php": {
            post: {
                summary: "Legacy login endpoint",
                responses: {
                    "200": { description: "Legacy login response" }
                }
            }
        },
        "/signup.php": {
            post: {
                summary: "Legacy signup endpoint",
                responses: {
                    "200": { description: "Legacy signup response" }
                }
            }
        },
        "/categories/health.php": {
            get: {
                summary: "Compatibility health check",
                responses: {
                    "200": { description: "Legacy health response" }
                }
            }
        },
        "/categories/login.php": {
            post: {
                summary: "Legacy login endpoint",
                responses: {
                    "200": { description: "Legacy login response" }
                }
            }
        },
        "/categories/signup.php": {
            post: {
                summary: "Legacy signup endpoint",
                responses: {
                    "200": { description: "Legacy signup response" }
                }
            }
        }
    }
};
function createOpenApiRouter() {
    const router = (0, express_1.Router)();
    router.get("/openapi.json", (_request, response) => {
        response.json(document);
    });
    router.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(document));
    return router;
}
