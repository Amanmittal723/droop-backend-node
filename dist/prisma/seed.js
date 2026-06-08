"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Purpose: Seed the reference lookup tables needed for application startup.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Console output indicating which reference seeds were applied.
 */
require("dotenv/config");
const client_1 = require("@prisma/client");
const seed_data_1 = require("./seed-data");
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/droop_backend_node";
const prisma = new client_1.PrismaClient();
async function upsertBusinesses() {
    for (const business of seed_data_1.seedBusinesses) {
        await prisma.businessMaster.upsert({
            where: { id: business.id },
            create: business,
            update: { name: business.name }
        });
    }
}
async function upsertCategories() {
    for (const category of seed_data_1.seedCategories) {
        await prisma.categoriesMaster.upsert({
            where: { id: category.id },
            create: category,
            update: {
                name: category.name,
                image: category.image
            }
        });
    }
}
async function upsertInterests() {
    for (const interest of seed_data_1.seedInterests) {
        await prisma.interestMaster.upsert({
            where: { id: interest.id },
            create: interest,
            update: {
                name: interest.name,
                image: interest.image
            }
        });
    }
}
async function main() {
    await upsertBusinesses();
    await upsertCategories();
    await upsertInterests();
    console.log(`Seeded reference data: ${seed_data_1.seedBusinesses.length} businesses, ${seed_data_1.seedCategories.length} categories, ${seed_data_1.seedInterests.length} interests.`);
}
void main()
    .finally(async () => {
    await prisma.$disconnect();
});
