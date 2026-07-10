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
        summary: "Node and PostgreSQL health check",
        responses: {
          "200": { description: "Health response with app, database, storage, and dependency checks" }
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
    "/check_email": {
      post: {
        summary: "Check whether an email address is available for signup",
        responses: {
          "200": { description: "Legacy email availability response" }
        }
      }
    },
    "/check_username": {
      post: {
        summary: "Check whether a username is available for signup",
        responses: {
          "200": { description: "Legacy username availability response" }
        }
      }
    },
    "/signup_email": {
      post: {
        summary: "Create an account with email address, username, and password",
        responses: {
          "200": { description: "Legacy email signup response" }
        }
      }
    },
    "/forgot_pass": {
      post: {
        summary: "Send account recovery email for a username or registered email address",
        responses: {
          "200": { description: "Legacy password recovery response" }
        }
      }
    },
    "/categories/health": {
      get: {
        summary: "Node and PostgreSQL health check",
        responses: {
          "200": { description: "Health response with app, database, storage, and dependency checks" }
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
    },
    "/categories/forgot_pass": {
      post: {
        summary: "Send account recovery email for a username or registered email address",
        responses: {
          "200": { description: "Legacy password recovery response" }
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
