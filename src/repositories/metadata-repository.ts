/**
 * Purpose: Load categories, interests, and businesses exactly as the PHP helper classes do.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Arrays of raw rows with legacy column names preserved.
 */
import { PrismaClient } from "@prisma/client";

export class MetadataRepository {
  public constructor(private readonly prismaClient: PrismaClient) {}

  public async getCategories(): Promise<Record<string, unknown>[]> {
    return this.prismaClient.$queryRaw<Record<string, unknown>[]>`select * from categories_master`;
  }

  public async getInterests(): Promise<Record<string, unknown>[]> {
    return this.prismaClient.$queryRaw<Record<string, unknown>[]>`select * from interest_master`;
  }

  public async getBusinesses(): Promise<Record<string, unknown>[]> {
    return this.prismaClient.$queryRaw<Record<string, unknown>[]>`select * from business_master`;
  }
}
