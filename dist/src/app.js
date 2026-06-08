"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
/**
 * Purpose: Assemble the Express application with legacy parsing, compatibility routes, and diagnostics.
 * Expected request body: Form, JSON, or multipart fields used by the migrated legacy endpoints.
 * Expected query parameters: Legacy query keys consumed by mounted routes.
 * Expected headers: Standard HTTP headers, multipart content types, and host headers for URL generation.
 * Expected response structure: Legacy-compatible endpoint responses and additive OpenAPI diagnostics.
 */
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const pino_http_1 = __importDefault(require("pino-http"));
const env_1 = require("./config/env");
const prisma_1 = require("./db/prisma");
const logger_1 = require("./lib/logger");
const legacy_request_1 = require("./lib/legacy-request");
const routes_1 = require("./routes");
const openapi_routes_1 = require("./routes/openapi-routes");
const storage_1 = require("./lib/storage");
const mail_service_1 = require("./services/mail-service");
const stripe_service_1 = require("./services/stripe-service");
function createApp(dependencies) {
    const app = (0, express_1.default)();
    const upload = (0, multer_1.default)({
        limits: {
            fieldSize: 50 * 1024 * 1024,
            fileSize: 100 * 1024 * 1024
        }
    });
    const resolvedDependencies = {
        prismaClient: dependencies?.prismaClient ?? prisma_1.prisma,
        stripeService: dependencies?.stripeService ?? new stripe_service_1.StripeService(),
        mailService: dependencies?.mailService ?? new mail_service_1.MailService()
    };
    app.disable("x-powered-by");
    app.use((0, pino_http_1.default)({ logger: logger_1.logger }));
    app.use(express_1.default.json({ limit: "50mb" }));
    app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
    app.use(upload.any());
    app.use(legacy_request_1.legacyRequestMiddleware);
    void (0, storage_1.ensureRuntimeDirectories)();
    app.use("/storage", express_1.default.static(env_1.env.legacyStorageRoot));
    app.use("/categories/storyPost", express_1.default.static(`${env_1.env.legacyStorageRoot}/storyPost`));
    app.use("/categories/thumbnails", express_1.default.static(env_1.env.legacyThumbnailsRoot));
    app.use("/categories/videoPosts", express_1.default.static(env_1.env.legacyVideoPostsRoot));
    app.use((0, routes_1.createCompatibilityRouter)(resolvedDependencies));
    app.use("/categories", (0, routes_1.createCompatibilityRouter)(resolvedDependencies));
    if (env_1.env.swaggerEnabled) {
        app.use((0, openapi_routes_1.createOpenApiRouter)());
    }
    app.use((error, _request, response, _next) => {
        logger_1.logger.error({ err: error }, "Unhandled application error");
        response.status(500).json({
            status: "0",
            message: error.message
        });
    });
    return app;
}
