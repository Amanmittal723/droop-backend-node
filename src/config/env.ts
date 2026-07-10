/**
 * Purpose: Parse and expose runtime environment variables for the compatibility backend.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Normalized environment configuration object.
 */
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(2000),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/droop_backend_node"),
  LEGACY_PUBLIC_BASE_URL: z.string().default("http://localhost:2000/categories"),
  LEGACY_STORAGE_BASE_URL: z.string().default("http://localhost:2000/storage"),
  LEGACY_STORAGE_ROOT: z.string().default("./storage"),
  LEGACY_THUMBNAILS_ROOT: z.string().default("./runtime/thumbnails"),
  LEGACY_VIDEO_POSTS_ROOT: z.string().default("./runtime/videoPosts"),
  LEGACY_PHP_ROOT: z.string().default("./legacy-php"),
  SWAGGER_ENABLED: z.string().default("true"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_CLIENT_ID: z.string().optional(),
  WOWZA_API_KEY: z.string().optional(),
  WOWZA_ACCESS_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.string().optional(),
  SMTP_USERNAME: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_ADDRESS: z.string().optional(),
  SMTP_FROM_NAME: z.string().optional(),
  APNS_CERT_PATH: z.string().optional(),
  APNS_DEV_CERT_PATH: z.string().optional(),
  APNS_CERT_PASSPHRASE: z.string().optional(),
  APNS_TOPIC: z.string().optional(),
  STRIPE_RETURN_TO_APP_URL: z.string().default("com.droop://auth?token=1234")
});

const parsed = envSchema.parse(process.env);
const legacyPhpRoot = path.resolve(process.cwd(), parsed.LEGACY_PHP_ROOT);

export const env = {
  ...parsed,
  swaggerEnabled: parsed.SWAGGER_ENABLED !== "false",
  smtpSecure: parsed.SMTP_SECURE ? parsed.SMTP_SECURE !== "false" : parsed.SMTP_PORT === 465,
  smtpFromAddress: parsed.SMTP_FROM_ADDRESS ?? parsed.SMTP_USERNAME ?? "help@droopllc.com",
  smtpFromName: parsed.SMTP_FROM_NAME ?? "Droop",
  apnsTopic: parsed.APNS_TOPIC ?? "iphone.maargah",
  legacyPhpRoot,
  legacyStorageRoot: path.resolve(process.cwd(), parsed.LEGACY_STORAGE_ROOT),
  legacyThumbnailsRoot: path.resolve(process.cwd(), parsed.LEGACY_THUMBNAILS_ROOT),
  legacyVideoPostsRoot: path.resolve(process.cwd(), parsed.LEGACY_VIDEO_POSTS_ROOT),
  apnsCertPath: parsed.APNS_CERT_PATH ? path.resolve(process.cwd(), parsed.APNS_CERT_PATH) : path.join(legacyPhpRoot, "droop_prod_pushcert.pem"),
  apnsDevCertPath: parsed.APNS_DEV_CERT_PATH
    ? path.resolve(process.cwd(), parsed.APNS_DEV_CERT_PATH)
    : path.join(legacyPhpRoot, "droop_dev_pushcert.pem")
};
