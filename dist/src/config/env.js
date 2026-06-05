"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
/**
 * Purpose: Parse and expose runtime environment variables for the compatibility backend.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Normalized environment configuration object.
 */
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.string().default("development"),
    PORT: zod_1.z.coerce.number().default(3000),
    DATABASE_URL: zod_1.z.string().default("postgresql://postgres:postgres@localhost:5432/droop_backend_node"),
    LEGACY_PUBLIC_BASE_URL: zod_1.z.string().default("http://localhost:3000/categories"),
    LEGACY_STORAGE_BASE_URL: zod_1.z.string().default("http://localhost:3000/storage"),
    LEGACY_STORAGE_ROOT: zod_1.z.string().default("./storage"),
    LEGACY_THUMBNAILS_ROOT: zod_1.z.string().default("./runtime/thumbnails"),
    LEGACY_VIDEO_POSTS_ROOT: zod_1.z.string().default("./runtime/videoPosts"),
    LEGACY_PHP_ROOT: zod_1.z.string().default("/Volumes/flutterMas/codibex/droop-backend/categories"),
    LEGACY_SQL_DUMP: zod_1.z.string().default("/Volumes/flutterMas/codibex/droop-backend/droop1988_appdb.sql"),
    SWAGGER_ENABLED: zod_1.z.string().default("true"),
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: zod_1.z.string().optional(),
    STRIPE_CLIENT_ID: zod_1.z.string().optional(),
    WOWZA_API_KEY: zod_1.z.string().optional(),
    WOWZA_ACCESS_KEY: zod_1.z.string().optional(),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().default(587),
    SMTP_SECURE: zod_1.z.string().optional(),
    SMTP_USERNAME: zod_1.z.string().optional(),
    SMTP_PASSWORD: zod_1.z.string().optional(),
    SMTP_FROM_ADDRESS: zod_1.z.string().optional(),
    SMTP_FROM_NAME: zod_1.z.string().optional(),
    APNS_CERT_PATH: zod_1.z.string().optional(),
    APNS_DEV_CERT_PATH: zod_1.z.string().optional(),
    APNS_CERT_PASSPHRASE: zod_1.z.string().optional(),
    APNS_TOPIC: zod_1.z.string().optional(),
    STRIPE_RETURN_TO_APP_URL: zod_1.z.string().default("com.droop://auth?token=1234")
});
const parsed = envSchema.parse(process.env);
const legacyPhpRoot = node_path_1.default.resolve(process.cwd(), parsed.LEGACY_PHP_ROOT);
exports.env = {
    ...parsed,
    swaggerEnabled: parsed.SWAGGER_ENABLED !== "false",
    smtpSecure: parsed.SMTP_SECURE ? parsed.SMTP_SECURE !== "false" : parsed.SMTP_PORT === 465,
    smtpFromAddress: parsed.SMTP_FROM_ADDRESS ?? parsed.SMTP_USERNAME ?? "help@droopllc.com",
    smtpFromName: parsed.SMTP_FROM_NAME ?? "Droop",
    apnsTopic: parsed.APNS_TOPIC ?? "iphone.maargah",
    legacyPhpRoot,
    legacyStorageRoot: node_path_1.default.resolve(process.cwd(), parsed.LEGACY_STORAGE_ROOT),
    legacyThumbnailsRoot: node_path_1.default.resolve(process.cwd(), parsed.LEGACY_THUMBNAILS_ROOT),
    legacyVideoPostsRoot: node_path_1.default.resolve(process.cwd(), parsed.LEGACY_VIDEO_POSTS_ROOT),
    apnsCertPath: parsed.APNS_CERT_PATH ? node_path_1.default.resolve(process.cwd(), parsed.APNS_CERT_PATH) : node_path_1.default.join(legacyPhpRoot, "droop_prod_pushcert.pem"),
    apnsDevCertPath: parsed.APNS_DEV_CERT_PATH
        ? node_path_1.default.resolve(process.cwd(), parsed.APNS_DEV_CERT_PATH)
        : node_path_1.default.join(legacyPhpRoot, "droop_dev_pushcert.pem")
};
