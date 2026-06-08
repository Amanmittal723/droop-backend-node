/**
 * Purpose: Encapsulate legacy dual feed and post listing SQL used by compatibility controllers.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Raw rows and totals matching legacy PHP feed queries.
 */
import { LegacyRow } from "../../lib/legacy-row";
import { escapeSql } from "../../lib/legacy-sql";
import { LegacyBaseRepository } from "./base-repository";

type DualFeedOptions = {
  includeSaved?: boolean;
  includeLoveCount?: boolean;
  type?: string;
  screen?: string;
  random?: string;
  seed?: string;
  categoryIds?: string;
  interestIds?: string;
  onlyUser?: string;
  forceFollowingOnly?: boolean;
  ageFilterDays?: number | null;
  notOlderThanDays?: number | null;
  notFollowed?: boolean;
  userDetail?: boolean;
  includeLinkedPrices?: boolean;
  limit?: string;
  start?: string;
  pageSize?: string;
  queryMessage?: string;
};

export class LegacyFeedRepository extends LegacyBaseRepository {
  public async dualFeedRows(
    userId: string,
    options: DualFeedOptions
  ): Promise<{ rows: LegacyRow[]; total: number; seed: string }> {
    const followingRows = await this.queryRows<{ following_id: string }>(
      `SELECT following_id FROM followers_master WHERE followed_by='${escapeSql(userId)}'`
    );
    const followingIds = followingRows.map((row) => String(row.following_id).trim()).filter((entry) => entry.length > 0);
    const followingCsv = followingIds.map((id) => `'${escapeSql(id)}'`).join(",");

    const blockedByRows = await this.queryRows<{ user_id: string }>(
      `SELECT user_id FROM blocks_master WHERE block_id='${escapeSql(userId)}'`
    );
    const blockedRows = await this.queryRows<{ block_id: string }>(
      `SELECT block_id FROM blocks_master WHERE user_id='${escapeSql(userId)}'`
    );
    const blockedIds = [...blockedByRows.map((row) => String(row.user_id).trim()), ...blockedRows.map((row) => String(row.block_id).trim())]
      .filter((entry) => entry.length > 0);
    const blockedCsv = blockedIds.map((id) => `'${escapeSql(id)}'`).join(",");

    const categoryFilter = options.categoryIds
      ? `dp.dual_id in (select DISTINCT dual_id from dualpost_category where category_id in(${options.categoryIds}))`
      : "";
    const interestFilter = options.interestIds
      ? `dp.dual_id in (select DISTINCT dual_id from dualpost_interest where interest_id in(${options.interestIds}))`
      : "";

    const type = (options.type ?? "").toLowerCase();
    const screen = (options.screen ?? "").toLowerCase();
    const random = String(options.random ?? "") === "1";
    const seed = options.seed ?? String(Date.now());

    const whereParts: string[] = [];
    whereParts.push("dp.dual_caption!='Not Provided'");
    whereParts.push("dp.is_reported='NO'");

    const useDualType2 = options.onlyUser ? false : true;
    if (useDualType2) {
      const followClause = followingCsv.length > 0 ? `(dp.dual_posted_by='${escapeSql(userId)}' OR dp.dual_posted_by IN (${followingCsv}))` : `dp.dual_posted_by='${escapeSql(userId)}'`;
      whereParts.push("(dp.dual_linked_to<=0 OR dp.dual_linked_to=-1)");
      if (options.forceFollowingOnly) {
        whereParts.push(followClause);
      }
    }

    if (options.onlyUser) {
      whereParts.push(`(dp.dual_posted_by='${escapeSql(options.onlyUser)}' OR dp.dual_linked_to=${Number(options.onlyUser)})`);
    }

    if (blockedCsv.length > 0) {
      whereParts.push(`dp.dual_posted_by NOT IN (${blockedCsv})`);
      whereParts.push(`dp.dual_linked_to NOT IN (${blockedCsv})`);
    }

    if (categoryFilter) {
      whereParts.push(categoryFilter);
    }
    if (interestFilter) {
      whereParts.push(interestFilter);
    }

    if (options.ageFilterDays) {
      whereParts.push(`dp.date_time > NOW() - INTERVAL '${Number(options.ageFilterDays)} days'`);
    }
    if (options.notOlderThanDays) {
      whereParts.push(`date(dp.date_time) <= CURRENT_DATE - INTERVAL '${Number(options.notOlderThanDays)} days'`);
    }
    if (random) {
      whereParts.push("date(dp.date_time) > CURRENT_DATE - INTERVAL '7 days'");
    }

    if (options.queryMessage) {
      whereParts.push(options.queryMessage.replace(/^\s*AND\s+/i, "").trim());
    }

    let sql = "SELECT dp.*";
    if (options.includeSaved) {
      sql += ", CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved, CASE WHEN sm.saved_by IS NULL THEN FALSE ELSE TRUE END as is_saved";
    } else {
      sql += ", CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved";
    }
    if (options.includeLoveCount) {
      sql += ", COALESCE((SELECT count(*) FROM love_master lm2 WHERE lm2.dual_id=dp.dual_id),0) AS loved_cnt";
    }
    if (options.includeLinkedPrices) {
      sql += ", um.video_price ,um.image_price ,um.story_price,um.is_free_promo,um2.video_price as linked_video_price,um2.image_price as linked_image_price,um2.story_price as linked_story_price,um2.is_free_promo as linked_is_free_promo";
    } else {
      sql += ", um.video_price ,um.image_price, um.story_price,um.is_free_promo";
    }
    sql += " FROM dualpost_master dp";
    sql += " LEFT JOIN user_master um on CAST(dp.dual_posted_by AS INTEGER) = um.user_id ";
    if (options.includeLinkedPrices) {
      sql += " LEFT JOIN user_master um2 on dp.dual_linked_to=um2.user_id ";
    }
    if (options.includeSaved) {
      sql += ` LEFT JOIN save_master sm on dp.dual_id=sm.dual_id and sm.saved_by=${Number(userId)}`;
    }
    sql += ` LEFT JOIN love_master lm on dp.dual_id=lm.dual_id and lm.loved_by=${Number(userId)}`;
    sql += ` WHERE ${whereParts.join(" AND ")}`;

    if (random) {
      sql += " ORDER BY RANDOM() ";
    } else {
      sql += " ORDER BY dp.date_time DESC ";
    }

    let limitClause = "";
    if (options.start !== undefined && options.pageSize !== undefined) {
      limitClause = ` LIMIT ${options.pageSize} OFFSET ${options.start}`;
    } else if (screen === "home" && (type === "post" || options.forceFollowingOnly)) {
      limitClause = " LIMIT 4";
    } else if (options.limit) {
      limitClause = ` LIMIT ${options.limit}`;
    }
    sql += limitClause;

    const rows = await this.queryRows<LegacyRow>(sql);
    const totalRow = await this.queryRow<{ total: number | bigint }>(
      `SELECT count(dp.dual_id) as total FROM dualpost_master dp WHERE ${whereParts.join(" AND ")}`
    );
    return { rows, total: Number(totalRow?.total ?? 0), seed };
  }

  public async savedDuals(userId: string): Promise<LegacyRow[]> {
    return this.queryRows<LegacyRow>(
      `SELECT dp.*, CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved, CASE WHEN sm.saved_by IS NULL THEN FALSE ELSE TRUE END as is_saved FROM dualpost_master dp LEFT JOIN save_master sm on dp.dual_id=sm.dual_id LEFT JOIN love_master lm on dp.dual_id=lm.dual_id and lm.loved_by=${Number(userId)} where sm.saved_by=${Number(userId)} order by sm.date_time DESC`
    );
  }

  public async lovedDuals(userId: string): Promise<LegacyRow[]> {
    return this.queryRows<LegacyRow>(
      `SELECT dp.*, CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved FROM dualpost_master dp LEFT JOIN love_master lm on dp.dual_id=lm.dual_id where lm.loved_by=${Number(userId)} order by lm.date_time DESC`
    );
  }

  public async suggestedVideos(userId: string): Promise<LegacyRow[]> {
    const followingRows = await this.queryRows<{ following_id: string }>(
      `SELECT following_id FROM followers_master WHERE followed_by='${escapeSql(userId)}'`
    );
    const followingCsv = followingRows
      .map((row) => String(row.following_id).trim())
      .filter((entry) => entry.length > 0)
      .map((id) => `'${escapeSql(id)}'`)
      .join(",");
    let sql = "SELECT dp.*, um.video_price ,um.image_price, um.story_price,um.is_free_promo,um.user_type FROM dualpost_master dp";
    sql += " LEFT JOIN user_master um on CAST(dp.dual_posted_by AS INTEGER) = um.user_id ";
    sql += " WHERE is_reported='NO'";
    sql += ` AND dual_posted_by <> '${escapeSql(userId)}'`;
    sql += " AND dual_caption!='Not Provided'";
    if (followingCsv.length > 0) {
      sql += ` AND dual_posted_by NOT IN (${followingCsv})`;
    }
    sql += " AND dual_type = 2 ORDER BY RANDOM() LIMIT 50";
    return this.queryRows<LegacyRow>(sql);
  }

  public async loveCount(dualId: string | number): Promise<number> {
    const row = await this.queryRow<{ loved_cnt: number | bigint }>(
      `SELECT count(*) AS loved_cnt FROM love_master WHERE dual_id=${Number(dualId)}`
    );
    return Number(row?.loved_cnt ?? 0);
  }
}
