/**
 * Purpose: Provide shared raw SQL helpers for the legacy compatibility repositories.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw rows and execution primitives matching legacy SQL usage.
 */
import { PrismaClient } from "@prisma/client";
import { LegacyRow } from "../lib/legacy-row";

export class LegacyBaseRepository {
  public constructor(protected readonly prismaClient: PrismaClient) {}

  protected async queryRows<T extends LegacyRow>(sql: string): Promise<T[]> {
    return this.prismaClient.$queryRawUnsafe<T[]>(sql);
  }

  protected async queryRow<T extends LegacyRow>(sql: string): Promise<T | null> {
    const rows = await this.queryRows<T>(sql);
    return rows[0] ?? null;
  }

  protected async exec(sql: string): Promise<void> {
    await this.prismaClient.$executeRawUnsafe(sql);
  }
}
