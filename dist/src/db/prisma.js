"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
/**
 * Purpose: Create and reuse the Prisma client for PostgreSQL access.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Shared Prisma client instance.
 */
const client_1 = require("@prisma/client");
const env_1 = require("../config/env");
process.env.DATABASE_URL ??= env_1.env.DATABASE_URL;
exports.prisma = new client_1.PrismaClient();
