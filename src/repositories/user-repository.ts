/**
 * Purpose: Encapsulate legacy user and profile SQL operations while preserving PHP field names.
 * Expected request body: Legacy auth and profile fields passed by service callers.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw database rows and scalar counts matching PHP queries.
 */
import { PrismaClient } from "@prisma/client";
import { normalizeLegacyEmail } from "../validators/auth-validator";

export class UserRepository {
  public constructor(private readonly prismaClient: PrismaClient) {}

  public async findByUsername(username: string): Promise<Record<string, unknown> | null> {
    const rows = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM user_master WHERE user_name = ${username}
    `;
    return rows[0] ?? null;
  }

  public async findByEmail(email: string): Promise<Record<string, unknown> | null> {
    const rows = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM user_master WHERE user_email = ${email}
    `;
    return rows[0] ?? null;
  }

  public async findByEmailOrUsername(value: string): Promise<Record<string, unknown> | null> {
    const rows = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM user_master WHERE user_email = ${value} OR user_name = ${value}
    `;
    return rows[0] ?? null;
  }

  public async findByLoginEmail(email: string): Promise<Record<string, unknown> | null> {
    const normalizedEmail = normalizeLegacyEmail(email);
    if (normalizedEmail.length <= 0) {
      return null;
    }

    return this.findByEmail(normalizedEmail);
  }

  public async findByUserId(userId: number | string): Promise<Record<string, unknown> | null> {
    const rows = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM user_master WHERE user_id = ${Number(userId)}
    `;
    return rows[0] ?? null;
  }

  public async findByFacebookEmail(email: string): Promise<Record<string, unknown> | null> {
    return this.findByEmail(email);
  }

  public async createUser(input: {
    name: string;
    email: string;
    password?: string;
    username: string;
    picturePath: string;
    deviceToken: string;
    deviceType: string;
    userType?: string | number;
    fbId?: string;
  }): Promise<number> {
    const rows = await this.prismaClient.$queryRaw<{ user_id: number }[]>`
      INSERT INTO user_master
        (
          user_full_name,
          user_email,
          user_mobile,
          user_pass,
          user_name,
          user_pic,
          user_location,
          user_views,
          user_bio,
          user_state,
          device_token,
          device_type,
          fb_id,
          user_type,
          hide_audience,
          stripe_customer_id,
          stripe_account_id,
          story_price,
          image_price,
          video_price,
          is_free_promo
        )
      VALUES
        (
          ${input.name},
          ${input.email},
          ${null},
          ${input.password ?? ""},
          ${input.username},
          ${input.picturePath},
          ${"NA"},
          ${"0"},
          ${""},
          ${"NA"},
          ${input.deviceToken},
          ${input.deviceType},
          ${input.fbId ?? ""},
          ${Number(input.userType ?? 1)},
          ${0},
          ${null},
          ${null},
          ${0},
          ${0},
          ${0},
          ${0}
        )
      RETURNING user_id
    `;
    return rows[0].user_id;
  }

  public async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE user_master SET stripe_customer_id = ${stripeCustomerId} WHERE user_id = ${userId}
    `;
  }

  public async updateStripeAccountId(userId: number, stripeAccountId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE user_master SET stripe_account_id = ${stripeAccountId} WHERE user_id = ${userId}
    `;
  }

  public async updateUserType(userId: number, userType: number): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE user_master SET user_type = ${userType} WHERE user_id = ${userId}
    `;
  }

  public async updateFacebookLogin(userId: number, fbId: string, deviceToken: string, deviceType: string): Promise<void> {
    if (deviceToken.length > 15) {
      await this.prismaClient.$executeRaw`
        UPDATE user_master SET fb_id = ${fbId}, device_token = ${deviceToken}, device_type = ${deviceType} WHERE user_id = ${userId}
      `;
      return;
    }

    await this.prismaClient.$executeRaw`
      UPDATE user_master SET fb_id = ${fbId} WHERE user_id = ${userId}
    `;
  }

  public async updateDevice(userId: number, deviceToken: string, deviceType: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE user_master SET device_token = ${deviceToken}, device_type = ${deviceType} WHERE user_id = ${userId}
    `;
  }

  public async getUserCategories(userId: number): Promise<number[]> {
    const rows = await this.prismaClient.$queryRaw<{ category_id: number }[]>`
      SELECT * FROM user_category WHERE user_id = ${userId}
    `;
    return rows.map((row) => Number(row.category_id));
  }

  public async getUserInterests(userId: number): Promise<number[]> {
    const rows = await this.prismaClient.$queryRaw<{ interest_id: number }[]>`
      SELECT * FROM user_interest WHERE user_id = ${userId}
    `;
    return rows.map((row) => Number(row.interest_id));
  }

  public async getUserBusinesses(userId: number): Promise<number[]> {
    const rows = await this.prismaClient.$queryRaw<{ business_id: number }[]>`
      SELECT * FROM user_business WHERE user_id = ${userId}
    `;
    return rows.map((row) => Number(row.business_id));
  }

  public async getUserCollabCount(userId: number): Promise<number> {
    const rows = await this.prismaClient.$queryRaw<{ total: bigint | number }[]>`
      SELECT count(distinct dual_id) as total
      FROM dualpost_master
      WHERE (dual_posted_by = ${String(userId)} OR dual_linked_to = ${userId})
        AND dual_linked_to > 0
        AND dual_caption != 'Not Provided'
        AND is_reported = 'NO'
    `;
    return Number(rows[0]?.total ?? 0);
  }

  public async getUserPostCount(userId: number): Promise<number> {
    const rows = await this.prismaClient.$queryRaw<{ total: bigint | number }[]>`
      SELECT count(distinct dual_id) as total
      FROM dualpost_master
      WHERE dual_posted_by = ${String(userId)}
        AND dual_caption != 'Not Provided'
        AND is_reported = 'NO'
    `;
    return Number(rows[0]?.total ?? 0);
  }

  public async getUserLikeCount(userId: number): Promise<number> {
    const rows = await this.prismaClient.$queryRaw<{ total: bigint | number }[]>`
      SELECT count(distinct loved_by) as total
      FROM love_master lm
      JOIN dualpost_master dm ON dm.dual_id = lm.dual_id
      WHERE dual_posted_by = ${String(userId)}
        AND dual_caption != 'Not Provided'
        AND is_reported = 'NO'
    `;
    return Number(rows[0]?.total ?? 0);
  }

  public async getFollowingCount(userId: number): Promise<number> {
    const rows = await this.prismaClient.$queryRaw<{ total: bigint | number }[]>`
      SELECT count(distinct following_id) as total FROM followers_master WHERE followed_by = ${String(userId)}
    `;
    return Number(rows[0]?.total ?? 0);
  }

  public async getFollowersCount(userId: number): Promise<number> {
    const rows = await this.prismaClient.$queryRaw<{ total: bigint | number }[]>`
      SELECT count(distinct followed_by) as total FROM followers_master WHERE following_id = ${String(userId)}
    `;
    return Number(rows[0]?.total ?? 0);
  }

  public async replaceUserCategorySelections(userId: number, categoryIds: number[]): Promise<void> {
    await this.prismaClient.$transaction([
      this.prismaClient.$executeRaw`DELETE FROM user_category WHERE user_id = ${userId}`,
      ...(categoryIds.length > 0
        ? [
            this.prismaClient.$executeRawUnsafe(
              `INSERT INTO user_category(user_id, category_id) VALUES ${categoryIds.map((categoryId) => `(${userId}, ${categoryId})`).join(",")}`
            )
          ]
        : [])
    ]);
  }

  public async replaceUserInterestSelections(userId: number, interestIds: number[]): Promise<void> {
    await this.prismaClient.$transaction([
      this.prismaClient.$executeRaw`DELETE FROM user_interest WHERE user_id = ${userId}`,
      ...(interestIds.length > 0
        ? [
            this.prismaClient.$executeRawUnsafe(
              `INSERT INTO user_interest(user_id, interest_id) VALUES ${interestIds.map((interestId) => `(${userId}, ${interestId})`).join(",")}`
            )
          ]
        : [])
    ]);
  }

  public async replaceUserBusinessSelections(userId: number, businessIds: number[]): Promise<void> {
    await this.prismaClient.$transaction([
      this.prismaClient.$executeRaw`DELETE FROM user_business WHERE user_id = ${userId}`,
      ...(businessIds.length > 0
        ? [
            this.prismaClient.$executeRawUnsafe(
              `INSERT INTO user_business(user_id, business_id) VALUES ${businessIds.map((businessId) => `(${userId}, ${businessId})`).join(",")}`
            )
          ]
        : [])
    ]);
  }
}
