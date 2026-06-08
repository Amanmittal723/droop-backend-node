/**
 * Purpose: Expose a minimal OpenAPI document and Swagger UI for the migrated compatibility routes.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: OpenAPI JSON or Swagger UI HTML.
 */
import { Router } from "express";
import swaggerUi from "swagger-ui-express";

const document = {
  openapi: "3.0.0",
  info: {
    title: "Droop Legacy Compatibility API",
    version: "0.1.0"
  },
  paths: {
    "/health": {
      get: {
        summary: "Compatibility health check",
        responses: {
          "200": { description: "Legacy health response" }
        }
      }
    },
    "/login": {
      post: {
        summary: "Legacy login endpoint",
        responses: {
          "200": { description: "Legacy login response" }
        }
      }
    },
    "/signup": {
      post: {
        summary: "Legacy signup endpoint",
        responses: {
          "200": { description: "Legacy signup response" }
        }
      }
    },
    "/categories/health": {
      get: {
        summary: "Compatibility health check",
        responses: {
          "200": { description: "Legacy health response" }
        }
      }
    },
    "/categories/login": {
      post: {
        summary: "Legacy login endpoint",
        responses: {
          "200": { description: "Legacy login response" }
        }
      }
    },
    "/categories/signup": {
      post: {
        summary: "Legacy signup endpoint",
        responses: {
          "200": { description: "Legacy signup response" }
        }
      }
    }
  }
};

export function createOpenApiRouter(): Router {
  const router = Router();
  router.get("/openapi.json", (_request, response) => {
    response.json(document);
  });
  router.use("/docs", swaggerUi.serve, swaggerUi.setup(document));
  return router;
}
