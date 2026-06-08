/**
 * Purpose: Encapsulate legacy follow and contact list SQL used by compatibility controllers.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw rows and counters for suggestion and follow queries.
 */
import { LegacyRow } from "../../lib/legacy-row";
import { escapeSql } from "../../lib/legacy-sql";
import { LegacyBaseRepository } from "./base-repository";

export class LegacyFollowRepository extends LegacyBaseRepository {
  public async upsertUserContacts(userId: string, emails: string[]): Promise<void> {
    if (emails.length === 0) {
      return;
    }

    for (const email of emails) {
      await this.exec(
        `INSERT INTO user_contact(user_id,email)
         SELECT ${Number(userId)}, '${escapeSql(email)}'
         WHERE NOT EXISTS (
           SELECT 1 FROM user_contact WHERE user_id=${Number(userId)} AND email='${escapeSql(email)}'
         )`
      );
    }
  }

  public async followingIds(userId: string): Promise<string[]> {
    const rows = await this.queryRows<{ following_id: string }>(
      `SELECT following_id FROM followers_master WHERE followed_by='${escapeSql(userId)}'`
    );
    return rows.map((row) => String(row.following_id).trim()).filter((entry) => entry.length > 0);
  }

  public async blockedByUserIds(userId: string): Promise<string[]> {
    const rows = await this.queryRows<{ user_id: string }>(
      `SELECT user_id FROM blocks_master WHERE block_id='${escapeSql(userId)}'`
    );
    return rows.map((row) => String(row.user_id).trim()).filter((entry) => entry.length > 0);
  }

  public async mutuallyBlockedIds(userId: string): Promise<string[]> {
    const blockedRows = await this.queryRows<{ user_id: string }>(
      `SELECT user_id FROM blocks_master WHERE block_id='${escapeSql(userId)}'`
    );
    const blockedRows2 = await this.queryRows<{ block_id: string }>(
      `SELECT block_id FROM blocks_master WHERE user_id='${escapeSql(userId)}'`
    );
    return [...blockedRows.map((row) => String(row.user_id).trim()), ...blockedRows2.map((row) => String(row.block_id).trim())]
      .filter((entry) => entry.length > 0);
  }

  public async randomSuggestedUsers(userId: string, followingCsv: string, offset: string, size: string): Promise<LegacyRow[]> {
    let sql = "SELECT user_id, user_pic, user_email, user_full_name, user_name, user_location, user_views, user_bio, user_state, user_type FROM user_master where user_id !=";
    sql += ` ${Number(userId)}`;
    if (followingCsv.length > 0) {
      sql += ` AND user_id not in(${followingCsv})`;
    }
    sql += ` ORDER BY RANDOM() LIMIT ${size} OFFSET ${offset}`;
    return this.queryRows<LegacyRow>(sql);
  }

  public async contactSuggestedUsers(userId: string, followingCsv: string, start: string, pageSize: string): Promise<LegacyRow[]> {
    let sql = "SELECT um.user_id, user_pic, user_email, user_full_name, user_name, user_location, user_views, user_bio, user_state, user_type";
    sql += " FROM user_master um INNER join user_contact uc on um.user_email=uc.email and uc.user_id=" + Number(userId);
    if (followingCsv.length > 0) {
      sql += ` where um.user_id not in(${followingCsv})`;
    }
    sql += ` LIMIT ${pageSize} OFFSET ${start}`;
    return this.queryRows<LegacyRow>(sql);
  }
}
