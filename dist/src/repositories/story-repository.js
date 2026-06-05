"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryRepository = void 0;
class StoryRepository {
    prismaClient;
    constructor(prismaClient) {
        this.prismaClient = prismaClient;
    }
    async createStory(input) {
        const rows = await this.prismaClient.$queryRaw `
      INSERT INTO story_master(story_image, story_posted_by, story_video, story_type, story_date, story_time, date_time)
      VALUES (${input.storyImage}, ${Number(input.storyPostedBy)}, ${input.storyVideo}, ${Number(input.storyType)}, ${input.storyDate}, ${input.storyTime}, ${input.dateTime}::timestamp)
      RETURNING *
    `;
        return rows[0] ?? null;
    }
    async findStoryByOwner(storyId, userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT story_id, story_image, story_video FROM story_master WHERE story_id = ${Number(storyId)} AND story_posted_by = ${Number(userId)}
    `;
        return rows[0] ?? null;
    }
    async deleteStory(storyId, userId) {
        await this.prismaClient.$executeRaw `
      DELETE FROM story_master WHERE story_id = ${Number(storyId)} AND story_posted_by = ${Number(userId)}
    `;
    }
    async listStories(userId) {
        const blockedBy = await this.prismaClient.$queryRaw `
      SELECT user_id FROM blocks_master WHERE block_id = ${userId}
    `;
        const blocked = await this.prismaClient.$queryRaw `
      SELECT block_id FROM blocks_master WHERE user_id = ${userId}
    `;
        const following = await this.prismaClient.$queryRaw `
      SELECT following_id FROM followers_master WHERE followed_by = ${userId}
    `;
        const blockIds = [...blockedBy.map((row) => String(row.user_id)), ...blocked.map((row) => String(row.block_id))].filter(Boolean);
        const followingIds = following.map((row) => String(row.following_id)).filter(Boolean);
        let sql = "SELECT sm.*, um.user_pic, um.user_name FROM story_master sm";
        sql += " LEFT JOIN user_master um on sm.story_posted_by = um.user_id";
        sql += " WHERE is_reported=0";
        sql += " AND sm.date_time >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '1 day')";
        sql += " AND story_posted_by > 0";
        sql += ` AND (story_posted_by=${Number(userId)}`;
        if (followingIds.length > 0) {
            sql += ` OR story_posted_by IN (${followingIds.map((id) => Number(id)).join(",")})`;
        }
        sql += ")";
        if (blockIds.length > 0) {
            sql += ` AND sm.story_posted_by NOT IN (${blockIds.map((id) => Number(id)).join(",")})`;
        }
        sql += " ORDER BY RANDOM() LIMIT 100";
        return this.prismaClient.$queryRawUnsafe(sql);
    }
}
exports.StoryRepository = StoryRepository;
