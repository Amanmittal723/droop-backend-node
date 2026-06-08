/**
 * Purpose: Seed the reference lookup tables needed for application startup.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Console output indicating which reference seeds were applied.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedBusinesses, seedCategories, seedInterests } from "./seed-data";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/droop_backend_node";

const prisma = new PrismaClient();

async function upsertBusinesses(): Promise<void> {
  for (const business of seedBusinesses) {
    await prisma.businessMaster.upsert({
      where: { id: business.id },
      create: business,
      update: { name: business.name }
    });
  }
}

async function upsertCategories(): Promise<void> {
  for (const category of seedCategories) {
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

async function upsertInterests(): Promise<void> {
  for (const interest of seedInterests) {
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

async function main(): Promise<void> {
  await upsertBusinesses();
  await upsertCategories();
  await upsertInterests();
  console.log(
    `Seeded reference data: ${seedBusinesses.length} businesses, ${seedCategories.length} categories, ${seedInterests.length} interests.`
  );
}

void main()
  .finally(async () => {
    await prisma.$disconnect();
  });
