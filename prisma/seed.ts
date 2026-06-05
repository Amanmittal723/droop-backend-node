/**
 * Purpose: Seed reference tables needed for application startup by extracting business, category, and interest data from the legacy SQL dump.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Console output indicating whether reference seeds were applied.
 */
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env";

const prisma = new PrismaClient();

function extractInsertValues(sql: string, tableName: string): string[] {
  const pattern = new RegExp(`INSERT INTO \\\`${tableName}\\\` \\([^;]+?\\) VALUES\\s*([\\s\\S]*?);`, "g");
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function parseTuples(valuesBlock: string): string[][] {
  const tuples: string[][] = [];
  let current = "";
  let inString = false;
  let depth = 0;
  const tupleStrings: string[] = [];

  for (let index = 0; index < valuesBlock.length; index += 1) {
    const char = valuesBlock[index];
    const previous = valuesBlock[index - 1];

    if (char === "'" && previous !== "\\") {
      inString = !inString;
    }

    if (!inString && char === "(") {
      if (depth === 0) {
        current = "";
      } else {
        current += char;
      }
      depth += 1;
      continue;
    }

    if (!inString && char === ")") {
      depth -= 1;
      if (depth === 0) {
        tupleStrings.push(current);
        current = "";
        continue;
      }
    }

    if (depth > 0) {
      current += char;
    }
  }

  for (const tuple of tupleStrings) {
    const values: string[] = [];
    let part = "";
    let quoted = false;
    for (let index = 0; index < tuple.length; index += 1) {
      const char = tuple[index];
      const previous = tuple[index - 1];
      if (char === "'" && previous !== "\\") {
        quoted = !quoted;
        continue;
      }
      if (char === "," && !quoted) {
        values.push(part.trim().replace(/\\'/g, "'"));
        part = "";
        continue;
      }
      part += char;
    }
    values.push(part.trim().replace(/\\'/g, "'"));
    tuples.push(values);
  }

  return tuples;
}

async function main(): Promise<void> {
  const dump = await fs.readFile(env.LEGACY_SQL_DUMP, "utf8");

  const businessRows = extractInsertValues(dump, "business_master").flatMap(parseTuples);
  const categoryRows = extractInsertValues(dump, "categories_master").flatMap(parseTuples);
  const interestRows = extractInsertValues(dump, "interest_master").flatMap(parseTuples);

  if (businessRows.length > 0) {
    await prisma.businessMaster.createMany({
      data: businessRows.map(([id, name]) => ({ id: Number(id), name })),
      skipDuplicates: true
    });
  }

  if (categoryRows.length > 0) {
    await prisma.categoriesMaster.createMany({
      data: categoryRows.map(([id, name, image]) => ({ id: Number(id), name, image })),
      skipDuplicates: true
    });
  }

  if (interestRows.length > 0) {
    await prisma.interestMaster.createMany({
      data: interestRows.map(([id, name, image]) => ({ id: Number(id), name, image })),
      skipDuplicates: true
    });
  }
}

void main()
  .finally(async () => {
    await prisma.$disconnect();
  });
