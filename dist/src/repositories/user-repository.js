"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
class UserRepository {
    prismaClient;
    constructor(prismaClient) {
        this.prismaClient = prismaClient;
    }
    async findByUsername(username) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM user_master WHERE user_name = ${username}
    `;
        return rows[0] ?? null;
    }
    async findByEmail(email) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM user_master WHERE user_email = ${email}
    `;
        return rows[0] ?? null;
    }
    async findByEmailOrUsername(value) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM user_master WHERE user_email = ${value} OR user_name = ${value}
    `;
        return rows[0] ?? null;
    }
    async findByUserId(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM user_master WHERE user_id = ${Number(userId)}
    `;
        return rows[0] ?? null;
    }
    async findByFacebookEmail(email) {
        return this.findByEmail(email);
    }
    async createUser(input) {
        const rows = await this.prismaClient.$queryRaw `
      INSERT INTO user_master
        (
          user_full_name,
          user_email,
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
    async updateStripeCustomerId(userId, stripeCustomerId) {
        await this.prismaClient.$executeRaw `
      UPDATE user_master SET stripe_customer_id = ${stripeCustomerId} WHERE user_id = ${userId}
    `;
    }
    async updateStripeAccountId(userId, stripeAccountId) {
        await this.prismaClient.$executeRaw `
      UPDATE user_master SET stripe_account_id = ${stripeAccountId} WHERE user_id = ${userId}
    `;
    }
    async updateUserType(userId, userType) {
        await this.prismaClient.$executeRaw `
      UPDATE user_master SET user_type = ${userType} WHERE user_id = ${userId}
    `;
    }
    async updateFacebookLogin(userId, fbId, deviceToken, deviceType) {
        if (deviceToken.length > 15) {
            await this.prismaClient.$executeRaw `
        UPDATE user_master SET fb_id = ${fbId}, device_token = ${deviceToken}, device_type = ${deviceType} WHERE user_id = ${userId}
      `;
            return;
        }
        await this.prismaClient.$executeRaw `
      UPDATE user_master SET fb_id = ${fbId} WHERE user_id = ${userId}
    `;
    }
    async updateDevice(userId, deviceToken, deviceType) {
        await this.prismaClient.$executeRaw `
      UPDATE user_master SET device_token = ${deviceToken}, device_type = ${deviceType} WHERE user_id = ${userId}
    `;
    }
    async getUserCategories(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM user_category WHERE user_id = ${userId}
    `;
        return rows.map((row) => Number(row.category_id));
    }
    async getUserInterests(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM user_interest WHERE user_id = ${userId}
    `;
        return rows.map((row) => Number(row.interest_id));
    }
    async getUserBusinesses(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM user_business WHERE user_id = ${userId}
    `;
        return rows.map((row) => Number(row.business_id));
    }
    async getUserCollabCount(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT count(distinct dual_id) as total
      FROM dualpost_master
      WHERE (dual_posted_by = ${String(userId)} OR dual_linked_to = ${userId})
        AND dual_linked_to > 0
        AND dual_caption != 'Not Provided'
        AND is_reported = 'NO'
    `;
        return Number(rows[0]?.total ?? 0);
    }
    async getUserPostCount(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT count(distinct dual_id) as total
      FROM dualpost_master
      WHERE dual_posted_by = ${String(userId)}
        AND dual_caption != 'Not Provided'
        AND is_reported = 'NO'
    `;
        return Number(rows[0]?.total ?? 0);
    }
    async getUserLikeCount(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT count(distinct loved_by) as total
      FROM love_master lm
      JOIN dualpost_master dm ON dm.dual_id = lm.dual_id
      WHERE dual_posted_by = ${String(userId)}
        AND dual_caption != 'Not Provided'
        AND is_reported = 'NO'
    `;
        return Number(rows[0]?.total ?? 0);
    }
    async getFollowingCount(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT count(distinct following_id) as total FROM followers_master WHERE followed_by = ${String(userId)}
    `;
        return Number(rows[0]?.total ?? 0);
    }
    async getFollowersCount(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT count(distinct followed_by) as total FROM followers_master WHERE following_id = ${String(userId)}
    `;
        return Number(rows[0]?.total ?? 0);
    }
    async replaceUserCategorySelections(userId, categoryIds) {
        await this.prismaClient.$transaction([
            this.prismaClient.$executeRaw `DELETE FROM user_category WHERE user_id = ${userId}`,
            ...(categoryIds.length > 0
                ? [
                    this.prismaClient.$executeRawUnsafe(`INSERT INTO user_category(user_id, category_id) VALUES ${categoryIds.map((categoryId) => `(${userId}, ${categoryId})`).join(",")}`)
                ]
                : [])
        ]);
    }
    async replaceUserInterestSelections(userId, interestIds) {
        await this.prismaClient.$transaction([
            this.prismaClient.$executeRaw `DELETE FROM user_interest WHERE user_id = ${userId}`,
            ...(interestIds.length > 0
                ? [
                    this.prismaClient.$executeRawUnsafe(`INSERT INTO user_interest(user_id, interest_id) VALUES ${interestIds.map((interestId) => `(${userId}, ${interestId})`).join(",")}`)
                ]
                : [])
        ]);
    }
    async replaceUserBusinessSelections(userId, businessIds) {
        await this.prismaClient.$transaction([
            this.prismaClient.$executeRaw `DELETE FROM user_business WHERE user_id = ${userId}`,
            ...(businessIds.length > 0
                ? [
                    this.prismaClient.$executeRawUnsafe(`INSERT INTO user_business(user_id, business_id) VALUES ${businessIds.map((businessId) => `(${userId}, ${businessId})`).join(",")}`)
                ]
                : [])
        ]);
    }
}
exports.UserRepository = UserRepository;
