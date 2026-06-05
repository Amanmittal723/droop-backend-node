"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialRepository = void 0;
class SocialRepository {
    prismaClient;
    constructor(prismaClient) {
        this.prismaClient = prismaClient;
    }
    async hasBlock(userId, blockId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM blocks_master WHERE user_id = ${userId} AND block_id = ${blockId}
    `;
        return rows.length > 0;
    }
    async hasFollow(followedBy, followingId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM followers_master WHERE followed_by = ${followedBy} AND following_id = ${followingId}
    `;
        return rows.length > 0;
    }
    async hasMute(userId, muteId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM mute_master WHERE user_id = ${Number(userId)} AND mute_id = ${Number(muteId)}
    `;
        return rows.length > 0;
    }
    async addBlock(userId, blockId) {
        await this.prismaClient.$executeRaw `
      INSERT INTO blocks_master(user_id, block_id) VALUES (${userId}, ${blockId})
    `;
    }
    async removeBlock(userId, blockId) {
        await this.prismaClient.$executeRaw `
      DELETE FROM blocks_master WHERE user_id = ${userId} AND block_id = ${blockId}
    `;
    }
    async addMute(userId, muteId) {
        await this.prismaClient.$executeRaw `
      INSERT INTO mute_master(user_id, mute_id) VALUES (${Number(userId)}, ${Number(muteId)})
    `;
    }
    async removeMute(userId, muteId) {
        await this.prismaClient.$executeRaw `
      DELETE FROM mute_master WHERE user_id = ${Number(userId)} AND mute_id = ${Number(muteId)}
    `;
    }
    async addFollow(followedBy, followingId) {
        await this.prismaClient.$executeRaw `
      INSERT INTO followers_master(followed_by, following_id) VALUES (${followedBy}, ${followingId})
    `;
    }
    async removeFollow(followedBy, followingId) {
        await this.prismaClient.$executeRaw `
      DELETE FROM followers_master WHERE followed_by = ${followedBy} AND following_id = ${followingId}
    `;
    }
    async hasSave(savedBy, dualId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM save_master WHERE saved_by = ${Number(savedBy)} AND dual_id = ${Number(dualId)}
    `;
        return rows.length > 0;
    }
    async addSave(savedBy, dualId, dateTime) {
        await this.prismaClient.$executeRaw `
      INSERT INTO save_master(saved_by, dual_id, date_time) VALUES (${Number(savedBy)}, ${Number(dualId)}, ${dateTime}::timestamp)
    `;
    }
    async removeSave(savedBy, dualId) {
        await this.prismaClient.$executeRaw `
      DELETE FROM save_master WHERE saved_by = ${Number(savedBy)} AND dual_id = ${Number(dualId)}
    `;
    }
    async hasLove(lovedBy, dualId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM love_master WHERE loved_by = ${Number(lovedBy)} AND dual_id = ${Number(dualId)}
    `;
        return rows.length > 0;
    }
    async addLove(lovedBy, dualId, dateTime) {
        await this.prismaClient.$executeRaw `
      INSERT INTO love_master(loved_by, dual_id, date_time) VALUES (${Number(lovedBy)}, ${Number(dualId)}, ${dateTime}::timestamp)
    `;
    }
    async removeLove(lovedBy, dualId) {
        await this.prismaClient.$executeRaw `
      DELETE FROM love_master WHERE loved_by = ${Number(lovedBy)} AND dual_id = ${Number(dualId)}
    `;
    }
    async getDualSummary(dualId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT dual_posted_by, dual_linked_to, dual_linked_name, dual_posted_name, dual_caption
      FROM dualpost_master
      WHERE dual_id = ${Number(dualId)}
    `;
        return rows[0] ?? null;
    }
    async listNotifications(userId, start, pageSize) {
        if (start !== undefined && pageSize !== undefined) {
            return this.prismaClient.$queryRawUnsafe(`SELECT t.*, tr.user_id, tr.user_pic, dm.dual_image, COALESCE(dm.receiver_user_status,0) as receiver_user_status
         FROM notifications_master t
         LEFT JOIN user_master tr on tr.user_id=CAST(t.shared_by AS INTEGER)
         LEFT JOIN dualpost_master dm on dm.dual_id=CAST(t.notification_dual_id AS INTEGER)
         WHERE t.notification_sent_to='${userId}'
         ORDER BY t.notification_id DESC
         LIMIT ${pageSize} OFFSET ${start}`);
        }
        return this.prismaClient.$queryRawUnsafe(`SELECT t.*, tr.user_id, tr.user_pic, dm.dual_image, COALESCE(dm.receiver_user_status,0) as receiver_user_status
       FROM notifications_master t
       LEFT JOIN user_master tr on tr.user_id=CAST(t.shared_by AS INTEGER)
       LEFT JOIN dualpost_master dm on dm.dual_id=CAST(t.notification_dual_id AS INTEGER)
       WHERE t.notification_sent_to='${userId}'
       ORDER BY t.notification_id DESC`);
    }
    async countNotifications(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT count(notification_id) as total FROM notifications_master WHERE notification_sent_to = ${userId}
    `;
        return Number(rows[0]?.total ?? 0);
    }
    async markNotificationsRead(userId) {
        await this.prismaClient.$executeRaw `
      UPDATE notifications_master SET isunread='NO' WHERE notification_sent_to = ${userId}
    `;
    }
    async deleteNotificationById(notificationId) {
        await this.prismaClient.$executeRaw `
      DELETE FROM notifications_master WHERE notification_id = ${Number(notificationId)}
    `;
    }
    async deleteNotificationsByUserId(userId) {
        await this.prismaClient.$executeRaw `
      DELETE FROM notifications_master WHERE notification_sent_to = ${userId}
    `;
    }
    async markMessageThreadRead(userId, senderId) {
        await this.prismaClient.$executeRaw `
      UPDATE message_thread SET isunread='NO' WHERE message_sender = ${senderId} AND message_receiver = ${userId}
    `;
    }
    async clearChat(userId, friendId) {
        await this.prismaClient.$transaction([
            this.prismaClient.$executeRawUnsafe(`UPDATE message_thread SET is_deleted='${userId}'
         WHERE ((message_receiver='${userId}' AND message_sender='${friendId}')
         OR (message_receiver='${friendId}' AND message_sender='${userId}'))
         AND (is_deleted='NO')`),
            this.prismaClient.$executeRawUnsafe(`UPDATE message_thread SET is_deleted='BOTH'
         WHERE ((message_receiver='${userId}' AND message_sender='${friendId}')
         OR (message_receiver='${friendId}' AND message_sender='${userId}'))
         AND (is_deleted='${friendId}')`),
            this.prismaClient.$executeRawUnsafe(`UPDATE messages_master SET is_deleted='${userId}'
         WHERE ((message_sender='${userId}' AND message_receiver='${friendId}')
         OR (message_receiver='${userId}' AND message_sender='${friendId}'))
         AND (is_deleted='NO')`),
            this.prismaClient.$executeRawUnsafe(`UPDATE messages_master SET is_deleted='BOTH'
         WHERE ((message_sender='${userId}' AND message_receiver='${friendId}')
         OR (message_receiver='${userId}' AND message_sender='${friendId}'))
         AND (is_deleted='${friendId}')`)
        ]);
    }
    async getUserPassword(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT user_pass FROM user_master WHERE user_id = ${Number(userId)}
    `;
        return rows[0]?.user_pass ?? null;
    }
    async updateUserPassword(userId, newPassword) {
        await this.prismaClient.$executeRaw `
      UPDATE user_master SET user_pass = ${newPassword} WHERE user_id = ${Number(userId)}
    `;
    }
    async markDualReported(dualId) {
        await this.prismaClient.$executeRaw `
      UPDATE dualpost_master SET is_reported='YES' WHERE dual_id = ${Number(dualId)}
    `;
    }
    async markLiveReported(liveId) {
        await this.prismaClient.$executeRaw `
      UPDATE "liveStream_master" SET is_reported='YES' WHERE live_id = ${Number(liveId)}
    `;
    }
    async markVentureReported(ventureId) {
        await this.prismaClient.$executeRaw `
      UPDATE venture_master SET is_reported='YES' WHERE venture_id = ${Number(ventureId)}
    `;
    }
    async deleteVenture(ventureId) {
        await this.prismaClient.$executeRaw `
      DELETE FROM venture_master WHERE venture_id = ${Number(ventureId)}
    `;
    }
    async updateVentureViews(ventureId, views) {
        await this.prismaClient.$executeRaw `
      UPDATE venture_master SET views_count = ${views} WHERE venture_id = ${Number(ventureId)}
    `;
    }
    async getLiveStreamById(liveId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM "liveStream_master" WHERE live_id = ${Number(liveId)}
    `;
        return rows[0] ?? null;
    }
    async updateLiveViewerCount(liveId, viewerCount) {
        await this.prismaClient.$executeRaw `
      UPDATE "liveStream_master" SET "viewersCount" = ${viewerCount} WHERE live_id = ${Number(liveId)}
    `;
    }
    async getTaggedUsers(userIdsCsv) {
        return this.prismaClient.$queryRawUnsafe(`SELECT user_id, user_pic, user_email, user_full_name, user_name FROM user_master WHERE user_id in (${userIdsCsv})`);
    }
    async getDualById(dualId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM dualpost_master WHERE dual_id = ${Number(dualId)} AND is_reported = 'NO' ORDER BY dual_id DESC
    `;
        return rows[0] ?? null;
    }
    async getDualViewUsers(dualId) {
        return this.prismaClient.$queryRaw `
      SELECT um.user_id, um.user_pic, um.user_name as name
      FROM dualpost_view dv
      LEFT JOIN user_master um on um.user_id = dv.user_id
      WHERE dv.dual_id = ${Number(dualId)}
    `;
    }
    async incrementDualView(dualId, userId) {
        const dual = await this.prismaClient.$queryRaw `
      SELECT * FROM dualpost_master WHERE dual_id = ${Number(dualId)}
    `;
        const row = dual[0];
        if (!row) {
            return null;
        }
        const viewCount = Number(row.view_count ?? 0) + 1;
        await this.prismaClient.$transaction([
            this.prismaClient.$executeRaw `
        UPDATE dualpost_master SET view_count = ${viewCount} WHERE dual_id = ${Number(dualId)}
      `,
            this.prismaClient.$executeRaw `
        INSERT INTO dualpost_view(user_id, dual_id) VALUES (${Number(userId)}, ${Number(dualId)})
      `
        ]);
        return row;
    }
    async incrementUserProfileViews(userId) {
        const rows = await this.prismaClient.$queryRaw `
      SELECT * FROM user_master WHERE user_id = ${Number(userId)}
    `;
        const row = rows[0];
        if (!row) {
            return false;
        }
        const viewCount = Number(row.user_views ?? 0) + 1;
        await this.prismaClient.$executeRaw `
      UPDATE user_master SET user_views = ${String(viewCount)} WHERE user_id = ${Number(userId)}
    `;
        return row;
    }
    async setUserPrices(userId, storyPrice, imagePrice, videoPrice, isFreePromo) {
        await this.prismaClient.$executeRaw `
      UPDATE user_master
      SET story_price = ${storyPrice},
          image_price = ${imagePrice},
          video_price = ${videoPrice},
          is_free_promo = ${Number(isFreePromo)}
      WHERE user_id = ${Number(userId)}
    `;
    }
    async createLivePost(input) {
        const rows = await this.prismaClient.$queryRaw `
      INSERT INTO "liveStream_master"(live_by, live_streamname, live_thumb, live_title, live_cost, "viewersCount", is_reported, pool_id)
      VALUES (${input.liveBy}, ${input.streamName}, ${input.thumbUrl}, ${input.title}, ${input.cost}, '0', 'NO', 0)
      RETURNING *
    `;
        return rows[0] ?? null;
    }
    async getLiveFeed(userId, screen) {
        const mode = screen.toLowerCase() === "home" ? "IN" : "NOT IN";
        const rows = await this.prismaClient.$queryRawUnsafe(`SELECT t.*, tr.* FROM user_master t, "liveStream_master" tr
       WHERE tr.live_by=t.user_id::text AND tr.is_reported='NO'
       AND tr.live_by <> '${userId}'
       AND CAST(tr.live_by AS INTEGER) ${mode} (SELECT CAST(following_id AS INTEGER) FROM followers_master WHERE followed_by='${userId}')
       ORDER BY tr.live_id DESC LIMIT 100`);
        return rows.map((row) => {
            const payload = { ...row };
            delete payload.info;
            delete payload.is_used;
            delete payload.status;
            delete payload.start_time;
            delete payload.stop_time;
            delete payload.user_pass;
            delete payload.user_name;
            payload.player_hls_playback_url = `http://162.241.190.88:1935/Droop1/${String(row.live_streamname ?? "")}/playlist.m3u8`;
            return payload;
        });
    }
    async deleteLive(liveId) {
        await this.prismaClient.$transaction([
            this.prismaClient.$executeRaw `DELETE FROM "liveStream_master" WHERE live_id = ${Number(liveId)}`,
            this.prismaClient.$executeRawUnsafe(`DELETE FROM comments_master WHERE broadcast_id = ${Number(liveId)}`)
        ]);
    }
    async expireInactiveLives() {
        const rows = await this.prismaClient.$queryRaw `
      SELECT live_by, live_streamname, last_checked_time, live_id FROM "liveStream_master"
    `;
        const now = Date.now();
        for (const row of rows) {
            const lastChecked = row.last_checked_time ? new Date(String(row.last_checked_time)).getTime() : 0;
            const diffSeconds = Math.abs(lastChecked - now) / 1000;
            if (diffSeconds > 60) {
                await this.deleteLive(String(row.live_id ?? ""));
            }
        }
    }
}
exports.SocialRepository = SocialRepository;
