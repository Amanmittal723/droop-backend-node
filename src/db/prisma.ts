/**
 * Purpose: Create and reuse the Prisma client for PostgreSQL access.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Shared Prisma client instance.
 */
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

process.env.DATABASE_URL ??= env.DATABASE_URL;

export const prisma = new PrismaClient();
