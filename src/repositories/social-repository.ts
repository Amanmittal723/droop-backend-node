/**
 * Purpose: Encapsulate legacy social graph, reaction, and notification SQL operations while preserving PHP semantics.
 * Expected request body: Caller-provided ids and text fields for social, save, love, and notification actions.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw rows and booleans used by compatibility controllers.
 */
import { PrismaClient } from "@prisma/client";

export class SocialRepository {
  public constructor(private readonly prismaClient: PrismaClient) {}

  public async hasBlock(userId: string, blockId: string): Promise<boolean> {
    const rows = await this.prismaClient.$queryRaw<{ user_id: string }[]>`
      SELECT * FROM blocks_master WHERE user_id = ${userId} AND block_id = ${blockId}
    `;
    return rows.length > 0;
  }

  public async hasFollow(followedBy: string, followingId: string): Promise<boolean> {
    const rows = await this.prismaClient.$queryRaw<{ followed_by: string }[]>`
      SELECT * FROM followers_master WHERE followed_by = ${followedBy} AND following_id = ${followingId}
    `;
    return rows.length > 0;
  }

  public async hasMute(userId: string, muteId: string): Promise<boolean> {
    const rows = await this.prismaClient.$queryRaw<{ user_id: number }[]>`
      SELECT * FROM mute_master WHERE user_id = ${Number(userId)} AND mute_id = ${Number(muteId)}
    `;
    return rows.length > 0;
  }

  public async addBlock(userId: string, blockId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      INSERT INTO blocks_master(user_id, block_id) VALUES (${userId}, ${blockId})
    `;
  }

  public async removeBlock(userId: string, blockId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      DELETE FROM blocks_master WHERE user_id = ${userId} AND block_id = ${blockId}
    `;
  }

  public async addMute(userId: string, muteId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      INSERT INTO mute_master(user_id, mute_id) VALUES (${Number(userId)}, ${Number(muteId)})
    `;
  }

  public async removeMute(userId: string, muteId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      DELETE FROM mute_master WHERE user_id = ${Number(userId)} AND mute_id = ${Number(muteId)}
    `;
  }

  public async addFollow(followedBy: string, followingId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      INSERT INTO followers_master(followed_by, following_id) VALUES (${followedBy}, ${followingId})
    `;
  }

  public async removeFollow(followedBy: string, followingId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      DELETE FROM followers_master WHERE followed_by = ${followedBy} AND following_id = ${followingId}
    `;
  }

  public async hasSave(savedBy: string, dualId: string): Promise<boolean> {
    const rows = await this.prismaClient.$queryRaw<{ saved_by: number }[]>`
      SELECT * FROM save_master WHERE saved_by = ${Number(savedBy)} AND dual_id = ${Number(dualId)}
    `;
    return rows.length > 0;
  }

  public async addSave(savedBy: string, dualId: string, dateTime: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      INSERT INTO save_master(saved_by, dual_id, date_time) VALUES (${Number(savedBy)}, ${Number(dualId)}, ${dateTime}::timestamp)
    `;
  }

  public async removeSave(savedBy: string, dualId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      DELETE FROM save_master WHERE saved_by = ${Number(savedBy)} AND dual_id = ${Number(dualId)}
    `;
  }

  public async hasLove(lovedBy: string, dualId: string): Promise<boolean> {
    const rows = await this.prismaClient.$queryRaw<{ loved_by: number }[]>`
      SELECT * FROM love_master WHERE loved_by = ${Number(lovedBy)} AND dual_id = ${Number(dualId)}
    `;
    return rows.length > 0;
  }

  public async addLove(lovedBy: string, dualId: string, dateTime: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      INSERT INTO love_master(loved_by, dual_id, date_time) VALUES (${Number(lovedBy)}, ${Number(dualId)}, ${dateTime}::timestamp)
    `;
  }

  public async removeLove(lovedBy: string, dualId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      DELETE FROM love_master WHERE loved_by = ${Number(lovedBy)} AND dual_id = ${Number(dualId)}
    `;
  }

  public async getDualSummary(dualId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      SELECT dual_posted_by, dual_linked_to, dual_linked_name, dual_posted_name, dual_caption
      FROM dualpost_master
      WHERE dual_id = ${Number(dualId)}
    `;
    return rows[0] ?? null;
  }

  public async listNotifications(userId: string, start?: number, pageSize?: number): Promise<Record<string, unknown>[]> {
    if (start !== undefined && pageSize !== undefined) {
      return this.prismaClient.$queryRawUnsafe(
        `SELECT t.*, tr.user_id, tr.user_pic, dm.dual_image, COALESCE(dm.receiver_user_status,0) as receiver_user_status
         FROM notifications_master t
         LEFT JOIN user_master tr on tr.user_id=CAST(t.shared_by AS INTEGER)
         LEFT JOIN dualpost_master dm on dm.dual_id=CAST(t.notification_dual_id AS INTEGER)
         WHERE t.notification_sent_to='${userId}'
         ORDER BY t.notification_id DESC
         LIMIT ${pageSize} OFFSET ${start}`
      );
    }
    return this.prismaClient.$queryRawUnsafe(
      `SELECT t.*, tr.user_id, tr.user_pic, dm.dual_image, COALESCE(dm.receiver_user_status,0) as receiver_user_status
       FROM notifications_master t
       LEFT JOIN user_master tr on tr.user_id=CAST(t.shared_by AS INTEGER)
       LEFT JOIN dualpost_master dm on dm.dual_id=CAST(t.notification_dual_id AS INTEGER)
       WHERE t.notification_sent_to='${userId}'
       ORDER BY t.notification_id DESC`
    );
  }

  public async countNotifications(userId: string): Promise<number> {
    const rows = await this.prismaClient.$queryRaw<{ total: bigint | number }[]>`
      SELECT count(notification_id) as total FROM notifications_master WHERE notification_sent_to = ${userId}
    `;
    return Number(rows[0]?.total ?? 0);
  }

  public async markNotificationsRead(userId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE notifications_master SET isunread='NO' WHERE notification_sent_to = ${userId}
    `;
  }

  public async deleteNotificationById(notificationId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      DELETE FROM notifications_master WHERE notification_id = ${Number(notificationId)}
    `;
  }

  public async deleteNotificationsByUserId(userId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      DELETE FROM notifications_master WHERE notification_sent_to = ${userId}
    `;
  }

  public async markMessageThreadRead(userId: string, senderId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE message_thread SET isunread='NO' WHERE message_sender = ${senderId} AND message_receiver = ${userId}
    `;
  }

  public async clearChat(userId: string, friendId: string): Promise<void> {
    await this.prismaClient.$transaction([
      this.prismaClient.$executeRawUnsafe(
        `UPDATE message_thread SET is_deleted='${userId}'
         WHERE ((message_receiver='${userId}' AND message_sender='${friendId}')
         OR (message_receiver='${friendId}' AND message_sender='${userId}'))
         AND (is_deleted='NO')`
      ),
      this.prismaClient.$executeRawUnsafe(
        `UPDATE message_thread SET is_deleted='BOTH'
         WHERE ((message_receiver='${userId}' AND message_sender='${friendId}')
         OR (message_receiver='${friendId}' AND message_sender='${userId}'))
         AND (is_deleted='${friendId}')`
      ),
      this.prismaClient.$executeRawUnsafe(
        `UPDATE messages_master SET is_deleted='${userId}'
         WHERE ((message_sender='${userId}' AND message_receiver='${friendId}')
         OR (message_receiver='${userId}' AND message_sender='${friendId}'))
         AND (is_deleted='NO')`
      ),
      this.prismaClient.$executeRawUnsafe(
        `UPDATE messages_master SET is_deleted='BOTH'
         WHERE ((message_sender='${userId}' AND message_receiver='${friendId}')
         OR (message_receiver='${userId}' AND message_sender='${friendId}'))
         AND (is_deleted='${friendId}')`
      )
    ]);
  }

  public async getUserPassword(userId: string): Promise<string | null> {
    const rows = await this.prismaClient.$queryRaw<{ user_pass: string }[]>`
      SELECT user_pass FROM user_master WHERE user_id = ${Number(userId)}
    `;
    return rows[0]?.user_pass ?? null;
  }

  public async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE user_master SET user_pass = ${newPassword} WHERE user_id = ${Number(userId)}
    `;
  }

  public async markDualReported(dualId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE dualpost_master SET is_reported='YES' WHERE dual_id = ${Number(dualId)}
    `;
  }

  public async markLiveReported(liveId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE "liveStream_master" SET is_reported='YES' WHERE live_id = ${Number(liveId)}
    `;
  }

  public async markVentureReported(ventureId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE venture_master SET is_reported='YES' WHERE venture_id = ${Number(ventureId)}
    `;
  }

  public async deleteVenture(ventureId: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      DELETE FROM venture_master WHERE venture_id = ${Number(ventureId)}
    `;
  }

  public async updateVentureViews(ventureId: string, views: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE venture_master SET views_count = ${views} WHERE venture_id = ${Number(ventureId)}
    `;
  }

  public async getLiveStreamById(liveId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM "liveStream_master" WHERE live_id = ${Number(liveId)}
    `;
    return rows[0] ?? null;
  }

  public async updateLiveViewerCount(liveId: string, viewerCount: string): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE "liveStream_master" SET "viewersCount" = ${viewerCount} WHERE live_id = ${Number(liveId)}
    `;
  }

  public async getTaggedUsers(userIdsCsv: string): Promise<Record<string, unknown>[]> {
    return this.prismaClient.$queryRawUnsafe(
      `SELECT user_id, user_pic, user_email, user_full_name, user_name FROM user_master WHERE user_id in (${userIdsCsv})`
    );
  }

  public async getDualById(dualId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM dualpost_master WHERE dual_id = ${Number(dualId)} AND is_reported = 'NO' ORDER BY dual_id DESC
    `;
    return rows[0] ?? null;
  }

  public async getDualViewUsers(dualId: string): Promise<Record<string, unknown>[]> {
    return this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      SELECT um.user_id, um.user_pic, um.user_name as name
      FROM dualpost_view dv
      LEFT JOIN user_master um on um.user_id = dv.user_id
      WHERE dv.dual_id = ${Number(dualId)}
    `;
  }

  public async incrementDualView(dualId: string, userId: string): Promise<Record<string, unknown> | null> {
    const dual = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM dualpost_master WHERE dual_id = ${Number(dualId)}
    `;
    const row = dual[0];
    if (!row) {
      return null;
    }
    const viewCount = Number(row.view_count ?? 0) + 1;
    await this.prismaClient.$transaction([
      this.prismaClient.$executeRaw`
        UPDATE dualpost_master SET view_count = ${viewCount} WHERE dual_id = ${Number(dualId)}
      `,
      this.prismaClient.$executeRaw`
        INSERT INTO dualpost_view(user_id, dual_id) VALUES (${Number(userId)}, ${Number(dualId)})
      `
    ]);
    return row;
  }

  public async incrementUserProfileViews(userId: string): Promise<Record<string, unknown> | false> {
    const rows = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM user_master WHERE user_id = ${Number(userId)}
    `;
    const row = rows[0];
    if (!row) {
      return false;
    }
    const viewCount = Number(row.user_views ?? 0) + 1;
    await this.prismaClient.$executeRaw`
      UPDATE user_master SET user_views = ${String(viewCount)} WHERE user_id = ${Number(userId)}
    `;
    return row;
  }

  public async setUserPrices(
    userId: string,
    storyPrice: string,
    imagePrice: string,
    videoPrice: string,
    isFreePromo: string
  ): Promise<void> {
    await this.prismaClient.$executeRaw`
      UPDATE user_master
      SET story_price = ${storyPrice},
          image_price = ${imagePrice},
          video_price = ${videoPrice},
          is_free_promo = ${Number(isFreePromo)}
      WHERE user_id = ${Number(userId)}
    `;
  }

  public async createLivePost(input: {
    liveBy: string;
    streamName: string;
    thumbUrl: string;
    title: string;
    cost: string;
  }): Promise<Record<string, unknown> | null> {
    const rows = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
      INSERT INTO "liveStream_master"(live_by, live_streamname, live_thumb, live_title, live_cost, "viewersCount", is_reported, pool_id)
      VALUES (${input.liveBy}, ${input.streamName}, ${input.thumbUrl}, ${input.title}, ${input.cost}, '0', 'NO', 0)
      RETURNING *
    `;
    return rows[0] ?? null;
  }

  public async getLiveFeed(userId: string, screen: string): Promise<Record<string, unknown>[]> {
    const mode = screen.toLowerCase() === "home" ? "IN" : "NOT IN";
    const rows = await this.prismaClient.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT t.*, tr.* FROM user_master t, "liveStream_master" tr
       WHERE tr.live_by=t.user_id::text AND tr.is_reported='NO'
       AND tr.live_by <> '${userId}'
       AND CAST(tr.live_by AS INTEGER) ${mode} (SELECT CAST(following_id AS INTEGER) FROM followers_master WHERE followed_by='${userId}')
       ORDER BY tr.live_id DESC LIMIT 100`
    );

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

  public async deleteLive(liveId: string): Promise<void> {
    await this.prismaClient.$transaction([
      this.prismaClient.$executeRaw`DELETE FROM "liveStream_master" WHERE live_id = ${Number(liveId)}`,
      this.prismaClient.$executeRawUnsafe(`DELETE FROM comments_master WHERE broadcast_id = ${Number(liveId)}`)
    ]);
  }

  public async expireInactiveLives(): Promise<void> {
    const rows = await this.prismaClient.$queryRaw<Record<string, unknown>[]>`
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
