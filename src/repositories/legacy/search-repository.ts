/**
 * Purpose: Encapsulate legacy search SQL while preserving PHP endpoint semantics.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw rows for legacy search responses.
 */
import { LegacyRow } from "../../lib/legacy-row";
import { escapeSql } from "../../lib/legacy-sql";
import { LegacyBaseRepository } from "./base-repository";

export class LegacySearchRepository extends LegacyBaseRepository {
  public async searchVenture(searchTxt: string): Promise<LegacyRow[]> {
    return this.queryRows<LegacyRow>(
      `SELECT t.*, tr.* FROM user_master t, venture_master tr WHERE CAST(tr.venture_posted_by AS INTEGER)=t.user_id AND tr.is_reported='NO' AND LOWER(tr.venture_title) LIKE LOWER('%${escapeSql(searchTxt)}%') LIMIT 100`
    );
  }

  public async searchLive(searchTxt: string): Promise<LegacyRow[]> {
    return this.queryRows<LegacyRow>(
      `SELECT t.*, tr.* FROM user_master t, "liveStream_master" tr WHERE CAST(tr.live_by AS INTEGER)=t.user_id AND tr.is_reported='NO' AND LOWER(tr.live_title) LIKE LOWER('%${escapeSql(searchTxt)}%') LIMIT 100`
    );
  }

  public async searchDualPost(searchTxt: string): Promise<LegacyRow[]> {
    return this.queryRows<LegacyRow>(
      `SELECT * FROM dualpost_master WHERE is_reported='NO' AND LOWER(dual_caption) LIKE LOWER('%${escapeSql(searchTxt)}%') LIMIT 100`
    );
  }

  public async searchBusiness(searchTxt: string, userId: string, blockedCsv: string): Promise<LegacyRow[]> {
    let sql = "SELECT bm.name as business_name, um.user_id, user_pic, user_email, user_full_name, user_name, user_location, user_views, user_bio, user_state from business_master bm ";
    sql += " right JOIN user_business ub on ub.business_id = bm.id ";
    sql += "left join user_master um on um.user_id=ub.user_id ";
    sql += ` WHERE (LOWER(bm.name) LIKE LOWER('%${escapeSql(searchTxt)}%')) `;
    sql += ` AND ub.user_id <> ${Number(userId)} `;
    if (blockedCsv.length > 0) {
      sql += ` AND ub.user_id NOT IN (${blockedCsv})`;
    }
    sql += " LIMIT 100";
    return this.queryRows<LegacyRow>(sql);
  }

  public async searchUserPrefix(searchTxt: string, userId: string, blockedCsv: string, pageSize: string, start: string): Promise<LegacyRow[]> {
    let sql = "SELECT user_id, user_pic, user_email, user_full_name, user_name, user_location, user_views, user_bio, user_state FROM user_master";
    sql += ` WHERE (LOWER(user_name) LIKE LOWER('${escapeSql(searchTxt)}%'))`;
    sql += ` AND user_id <> ${Number(userId)}`;
    if (blockedCsv.length > 0) {
      sql += ` AND user_id NOT IN (${blockedCsv})`;
    }
    sql += ` LIMIT ${pageSize} OFFSET ${start}`;
    return this.queryRows<LegacyRow>(sql);
  }

  public async searchUserPrefixOrRandom(
    searchTxt: string,
    userId: string,
    blockedCsv: string,
    pageSize: string,
    start: string
  ): Promise<LegacyRow[]> {
    let sql = "SELECT user_id, user_pic, user_email, user_full_name, user_name, user_location, user_views, user_bio, user_state FROM user_master";
    sql += ` WHERE (LOWER(user_name) LIKE LOWER('${escapeSql(searchTxt)}%'))`;
    sql += ` AND user_id <> ${Number(userId)}`;
    if (blockedCsv.length > 0) {
      sql += ` AND user_id NOT IN (${blockedCsv})`;
    }
    if (searchTxt.length === 0) {
      sql += " ORDER BY RANDOM()";
    }
    sql += ` LIMIT ${pageSize} OFFSET ${start}`;
    return this.queryRows<LegacyRow>(sql);
  }
}
