/**
 * Purpose: Assemble the Express application with legacy parsing, compatibility routes, and diagnostics.
 * Expected request body: Form, JSON, or multipart fields used by the migrated legacy endpoints.
 * Expected query parameters: Legacy query keys consumed by mounted routes.
 * Expected headers: Standard HTTP headers, multipart content types, and host headers for URL generation.
 * Expected response structure: Legacy-compatible endpoint responses and additive OpenAPI diagnostics.
 */
import express from "express";
import multer from "multer";
import pinoHttp from "pino-http";
import { PrismaClient } from "@prisma/client";
import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { logger } from "./lib/logger";
import { legacyRequestMiddleware } from "./lib/legacy-request";
import { createCompatibilityRouter } from "./routes";
import { createOpenApiRouter } from "./routes/openapi-routes";
import { ensureRuntimeDirectories } from "./lib/storage";
import { MailService } from "./services/mail-service";
import { StripeService } from "./services/stripe-service";

export type AppDependencies = {
  prismaClient: PrismaClient;
  stripeService: StripeService;
  mailService: MailService;
};

export function createApp(dependencies?: Partial<AppDependencies>) {
  const app = express();
  const upload = multer({
    limits: {
      fieldSize: 50 * 1024 * 1024,
      fileSize: 100 * 1024 * 1024
    }
  });

  const resolvedDependencies: AppDependencies = {
    prismaClient: dependencies?.prismaClient ?? prisma,
    stripeService: dependencies?.stripeService ?? new StripeService(),
    mailService: dependencies?.mailService ?? new MailService()
  };

  app.disable("x-powered-by");
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(upload.any());
  app.use(legacyRequestMiddleware);
  void ensureRuntimeDirectories();

  app.use("/storage", express.static(env.legacyStorageRoot));
  app.use("/categories/storyPost", express.static(`${env.legacyStorageRoot}/storyPost`));
  app.use("/categories/thumbnails", express.static(env.legacyThumbnailsRoot));
  app.use("/categories/videoPosts", express.static(env.legacyVideoPostsRoot));

  app.use(createCompatibilityRouter(resolvedDependencies));
  app.use("/categories", createCompatibilityRouter(resolvedDependencies));

  if (env.swaggerEnabled) {
    app.use(createOpenApiRouter());
  }

  app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    logger.error({ err: error }, "Unhandled application error");
    response.status(500).json({
      status: "0",
      message: error.message
    });
  });

  return app;
}
