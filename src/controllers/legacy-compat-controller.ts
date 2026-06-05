/**
 * Purpose: Recreate the remaining legacy PHP endpoint families for dual posts, feeds, profile lookup, search, ventures, comments, diagnostics, and legacy compatibility utilities.
 * Expected request body: Legacy $_REQUEST-style fields including user_id, dual_id, category_ids, interest_ids, search_txt, venture_id, venture_title, comment_txt, and upload fields.
 * Expected query parameters: Any legacy PHP keys may arrive in the query string and are merged by middleware.
 * Expected headers: Standard HTTP headers plus multipart headers for uploads and Host for legacy URL generation.
 * Expected response structure: PHP-compatible JSON, HTML, or plain-text responses matching the original scripts as closely as possible.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { legacyRandomString } from "../lib/random";
import { legacyStorageDiskPath, legacyStoragePublicUrl, writeBase64File } from "../lib/storage";
import { sendLegacyJson } from "../lib/legacy-response";
import { NotificationService } from "../services/notification-service";
import { WowzaService } from "../services/wowza-service";
import { StripeService } from "../services/stripe-service";
import { ApnsService } from "../services/apns-service";

type LegacyCompatControllerDependencies = {
  prismaClient: PrismaClient;
  stripeService: StripeService;
};

type LegacyRow = Record<string, unknown>;
const execFileAsync = promisify(execFile);

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function numericList(value: string): number[] {
  return csvToList(value).map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry));
}

function nowString(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export class LegacyCompatController {
  private readonly prismaClient: PrismaClient;

  private readonly notificationService: NotificationService;

  private readonly wowzaService: WowzaService;

  private readonly stripeService: StripeService;

  private readonly apnsService: ApnsService;

  public constructor(dependencies: LegacyCompatControllerDependencies) {
    this.prismaClient = dependencies.prismaClient;
    this.notificationService = new NotificationService(dependencies.prismaClient);
    this.wowzaService = new WowzaService();
    this.stripeService = dependencies.stripeService;
    this.apnsService = new ApnsService();
  }

  private async queryRows<T extends LegacyRow>(sql: string): Promise<T[]> {
    return this.prismaClient.$queryRawUnsafe<T[]>(sql);
  }

  private async queryRow<T extends LegacyRow>(sql: string): Promise<T | null> {
    const rows = await this.queryRows<T>(sql);
    return rows[0] ?? null;
  }

  private async exec(sql: string): Promise<void> {
    await this.prismaClient.$executeRawUnsafe(sql);
  }

  private fileFromRequest(request: Request, field: string): Express.Multer.File | undefined {
    return (request.files as Express.Multer.File[] | undefined)?.find((file) => file.fieldname === field);
  }

  private async saveUploadedFile(baseDir: string, file: Express.Multer.File, extFallback: string): Promise<{ diskPath: string; publicUrl: string }> {
    const fileName = `${legacyRandomString(10)}${path.extname(file.originalname) || extFallback}`;
    const diskPath = path.join(baseDir, fileName);
    await fs.mkdir(baseDir, { recursive: true });
    await fs.writeFile(diskPath, file.buffer);
    return { diskPath, publicUrl: fileName };
  }

  private async saveBase64File(baseDir: string, ext: string, encoded: string): Promise<string> {
    const fileName = `${legacyRandomString(12)}.${ext}`;
    await fs.mkdir(baseDir, { recursive: true });
    await writeBase64File(path.join(baseDir, fileName), encoded);
    return fileName;
  }

  private async userBusinesses(userId: string | number): Promise<number[]> {
    const rows = await this.queryRows<{ business_id: number }>(
      `SELECT business_id FROM user_business WHERE user_id='${escapeSql(String(userId))}'`
    );
    return rows.map((row) => Number(row.business_id));
  }

  private async categories(): Promise<LegacyRow[]> {
    return this.queryRows("SELECT * FROM categories_master");
  }

  private async interests(): Promise<LegacyRow[]> {
    return this.queryRows("SELECT * FROM interest_master");
  }

  private async businesses(): Promise<LegacyRow[]> {
    return this.queryRows("SELECT * FROM business_master");
  }

  private async profileBase(userId: string, includeLoginStats = false): Promise<LegacyRow | null> {
    const row = await this.queryRow<LegacyRow>(`SELECT * FROM user_master WHERE user_id='${escapeSql(userId)}'`);
    if (!row) {
      return null;
    }

    row.stripe_account_id = row.stripe_account_id ? String(row.stripe_account_id) : "";

    const collabSql = `SELECT count(distinct dual_id) as total FROM dualpost_master WHERE (dual_posted_by='${escapeSql(userId)}' OR dual_linked_to=${Number(userId)}) AND dual_linked_to>0 AND dual_caption!='Not Provided' AND is_reported='NO'`;
    const postSql = `SELECT count(distinct dual_id) as total FROM dualpost_master WHERE (dual_posted_by='${escapeSql(userId)}' OR dual_linked_to=${Number(userId)}) AND dual_caption!='Not Provided' AND is_reported='NO'`;
    const likeSql = includeLoginStats
      ? `SELECT COUNT(lm.dual_id) as total FROM love_master lm join dualpost_master dm on dm.dual_id=lm.dual_id WHERE dual_posted_by='${escapeSql(userId)}' AND dual_caption!='Not Provided' AND is_reported='NO'`
      : `SELECT COUNT(lm.dual_id) as total FROM love_master lm join dualpost_master dm on dm.dual_id=lm.dual_id WHERE (dual_posted_by='${escapeSql(userId)}' OR dual_linked_to=${Number(userId)}) AND dual_caption!='Not Provided' AND is_reported='NO'`;
    const followingSql = `SELECT count(distinct following_id) as total FROM followers_master WHERE followed_by='${escapeSql(userId)}'`;
    const followersSql = `SELECT count(distinct followed_by) as total FROM followers_master WHERE following_id='${escapeSql(userId)}'`;

    const collabs = await this.queryRow<{ total: number | bigint }>(collabSql);
    const posts = await this.queryRow<{ total: number | bigint }>(postSql);
    const likes = await this.queryRow<{ total: number | bigint }>(likeSql);
    const following = await this.queryRow<{ total: number | bigint }>(followingSql);
    const followers = await this.queryRow<{ total: number | bigint }>(followersSql);

    row.user_collabs = Number(collabs?.total ?? 0);
    row.user_post = Number(posts?.total ?? 0);
    row.user_likes = Number(likes?.total ?? 0);
    row.following_count = Number(following?.total ?? 0);
    row.followers_count = Number(followers?.total ?? 0);
    return row;
  }

  private async updateProfileViewCount(userId: string, isCount = 0): Promise<LegacyRow | false> {
    const row = await this.queryRow<LegacyRow>(`SELECT * FROM user_master WHERE user_id=${Number(userId)}`);
    if (!row) {
      return false;
    }

    const currentViews = Number(row.user_views ?? 0);
    if (Number(isCount) === 1) {
      await this.exec(`UPDATE user_master SET user_views='${String(currentViews + 1)}' WHERE user_id=${Number(userId)}`);
      row.user_views = String(currentViews + 1);
    }

    if (currentViews > 0 && currentViews % 1000 === 0) {
      const count = currentViews / 1000;
      await this.notificationService.createNotification({
        text: `Congratulations you reached ${count} thousand customer views`,
        sentTo: userId,
        dual: "NO",
        sharedBy: userId,
        dateTime: nowString()
      });
    }

    return row;
  }

  private async buildFollowerList(userId: string, loggedUserId: string, includePrices = false): Promise<{ following: LegacyRow[]; followers: LegacyRow[] }> {
    const loggedFollowingRows = loggedUserId !== userId
      ? await this.queryRows<{ following_id: string }>(`SELECT distinct(tr.following_id) FROM followers_master tr WHERE tr.followed_by='${escapeSql(loggedUserId)}'`)
      : [];
    const loggedFollowing = loggedFollowingRows.map((row) => String(row.following_id));
    const loggedList = loggedFollowing.length > 0 ? loggedFollowing.join(",") : "";

    const selectUserFields = includePrices
      ? "t.user_id, t.user_pic, t.user_email, t.user_full_name, t.user_name,t.video_price ,t.image_price,t.story_price,t.is_free_promo, tr.*"
      : "t.user_id, t.user_pic, t.user_email, t.user_full_name, t.user_name, tr.*";
    const followFlag = loggedFollowing.length > 0 ? `CASE WHEN t.user_id in (${loggedList}) THEN 1 ELSE 0 END as is_following` : "1 as is_following";

    const followingSql = `SELECT distinct ${selectUserFields}, ${followFlag} FROM user_master t, followers_master tr WHERE CAST(tr.following_id AS INTEGER)=t.user_id AND tr.followed_by='${escapeSql(userId)}'`;
    const following = await this.queryRows<LegacyRow>(followingSql);

    let followers: LegacyRow[] = [];
    const followersSql = `SELECT distinct ${selectUserFields}, ${followFlag} FROM user_master t, followers_master tr WHERE CAST(tr.followed_by AS INTEGER)=t.user_id AND tr.following_id='${escapeSql(userId)}'`;
    followers = await this.queryRows<LegacyRow>(followersSql);

    return { following, followers };
  }

  private async insertBulkUserContacts(userId: string, emails: string[]): Promise<void> {
    if (emails.length === 0) {
      return;
    }
    const values = emails.map((email) => `(${Number(userId)}, '${escapeSql(email)}')`).join(",");
    await this.exec(`INSERT INTO user_contact(user_id,email) values ${values} ON DUPLICATE KEY UPDATE email=email`);
  }

  private async insertNotification(text: string, sentTo: string, dual: string, sharedBy: string, dualId?: string, notificationType?: number): Promise<void> {
    const columns = ["notification_txt", "notification_sent_to", "notification_dual", "shared_by", "date_time"];
    const values = [`'${escapeSql(text)}'`, `'${escapeSql(sentTo)}'`, `'${escapeSql(dual)}'`, `'${escapeSql(sharedBy)}'`, `'${nowString()}'`];
    if (dualId !== undefined) {
      columns.splice(3, 0, "notification_dual_id");
      values.splice(3, 0, `'${escapeSql(dualId)}'`);
    }
    if (notificationType !== undefined) {
      columns.splice(1, 0, "notification_type");
      values.splice(1, 0, String(notificationType));
    }
    await this.exec(`INSERT INTO notifications_master(${columns.join(",")}) values(${values.join(",")})`);
  }

  private async sendLegacyPush(request: Request, sandbox: boolean): Promise<void> {
    const message = getLegacyOptionalString(request, "message") ?? "";
    const employeeIds = (getLegacyOptionalString(request, "emp_id") ?? "")
      .split("#")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const fromId = getLegacyOptionalString(request, "from_id");

    for (const userId of employeeIds) {
      if (fromId) {
        const muteRow = await this.queryRows(
          `SELECT user_id FROM mute_master WHERE user_id=${Number(userId)} AND mute_id=${Number(fromId)}`
        );
        if (muteRow.length > 0) {
          continue;
        }
      }

      const user = await this.queryRow<LegacyRow>(`SELECT * FROM user_master WHERE user_id='${escapeSql(userId)}'`);
      const deviceToken = String(user?.device_token ?? "").trim();
      if (deviceToken.length === 0 || deviceToken === "NA") {
        continue;
      }

      try {
        await this.apnsService.sendPush(
          deviceToken,
          {
            message,
            dualId: getLegacyOptionalString(request, "dual_id"),
            friendId: getLegacyOptionalString(request, "friend_id"),
            userId: getLegacyOptionalString(request, "user_id"),
            notificationType: getLegacyOptionalString(request, "notification_type"),
            isCollaborate: getLegacyOptionalString(request, "is_collaborate") !== undefined
          },
          sandbox
        );
      } catch {
        // Preserve legacy behavior: best-effort delivery should not fail the endpoint response.
      }
    }
  }

  private async fetchDualsForFeed(sqlWhere: string, sqlOrder = "ORDER BY date_time DESC", limitClause = "", includePrices = true, includeSaved = true, includeLoveCount = true): Promise<LegacyRow[]> {
    let sql = "SELECT dp.*";
    if (includeSaved) {
      sql += ", CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved, CASE WHEN sm.saved_by IS NULL THEN FALSE ELSE TRUE END as is_saved";
    } else {
      sql += ", CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved";
    }
    if (includeLoveCount) {
      sql += ", COALESCE((SELECT count(*) FROM love_master lm2 WHERE lm2.dual_id=dp.dual_id),0) AS loved_cnt";
    }
    if (includePrices) {
      sql += ", um.video_price ,um.image_price, um.story_price,um.is_free_promo";
    }
    sql += " FROM dualpost_master dp";
    if (includePrices) {
      sql += " LEFT JOIN user_master um on dp.dual_posted_by = um.user_id ";
    }
    if (includeSaved) {
      sql += ` LEFT JOIN save_master sm on dp.dual_id=sm.dual_id and sm.saved_by=${this.currentUserId ?? 0}`;
    }
    sql += ` LEFT JOIN love_master lm on dp.dual_id=lm.dual_id and lm.loved_by=${this.currentUserId ?? 0}`;
    sql += ` WHERE ${sqlWhere}`;
    sql += ` ${sqlOrder}`;
    sql += ` ${limitClause}`;
    return this.queryRows(sql);
  }

  private currentUserId = 0;

  private async dualFeedRows(
    userId: string,
    options: {
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
    }
  ): Promise<{ rows: LegacyRow[]; total: number; seed?: string }> {
    this.currentUserId = Number(userId);

    const followingRows = await this.queryRows<{ following_id: string }>(`SELECT following_id FROM followers_master WHERE followed_by='${escapeSql(userId)}'`);
    const followingIds = followingRows.map((row) => String(row.following_id).trim()).filter((entry) => entry.length > 0);
    const followingCsv = followingIds.map((id) => `'${escapeSql(id)}'`).join(",");

    const blockedByRows = await this.queryRows<{ user_id: string }>(`SELECT user_id FROM blocks_master WHERE block_id='${escapeSql(userId)}'`);
    const blockedRows = await this.queryRows<{ block_id: string }>(`SELECT block_id FROM blocks_master WHERE user_id='${escapeSql(userId)}'`);
    const blockedIds = [...blockedByRows.map((row) => String(row.user_id).trim()), ...blockedRows.map((row) => String(row.block_id).trim())].filter((entry) => entry.length > 0);
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
    const seed = options.seed ?? String(Number(String((requestIpSeed())).replace(/\./g, "")) + Number(String(new Date().toISOString().slice(11, 16)).replace(":", "")));

    const whereParts: string[] = [];
    whereParts.push("dp.dual_caption!='Not Provided'");
    whereParts.push("dp.is_reported='NO'");

    const useDualType2 = options.onlyUser ? false : true;
    if (useDualType2) {
      const followClause = followingCsv.length > 0 ? `(dp.dual_posted_by='${escapeSql(userId)}' OR dp.dual_posted_by IN (${followingCsv}))` : `dp.dual_posted_by='${escapeSql(userId)}'`;
      whereParts.push(`(dp.dual_linked_to<=0 OR dp.dual_linked_to=-1)`);
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
      sql += ` ORDER BY RANDOM() `;
    } else {
      sql += " ORDER BY dp.date_time DESC ";
    }
    const start = getLegacyOptionalString as unknown;
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
    const totalRow = await this.queryRow<{ total: number | bigint }>(`SELECT count(dp.dual_id) as total FROM dualpost_master dp WHERE ${whereParts.join(" AND ")}`);
    return { rows, total: Number(totalRow?.total ?? 0), seed };
  }

  public addContacts = async (request: Request, response: Response): Promise<void> => {
    try {
      const payload = typeof request.body === "object" && request.body ? request.body : {};
      const userId = String((payload as Record<string, unknown>).user_id ?? "");
      const rawEmails = (payload as Record<string, unknown>).emails;
      const emails = Array.isArray(rawEmails) ? (rawEmails as unknown[]).map((entry) => String(entry)) : [];
      await this.insertBulkUserContacts(userId, emails);
      sendLegacyJson(response, { status: "1", message: "Success!" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error inserting data" });
    }
  };

  public delUser = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getLegacyString(request, "user_id");
      await this.exec(`DELETE FROM user_master WHERE user_id='${escapeSql(userId)}'`);
      await this.exec(`DELETE FROM comments_master WHERE comment_by='${escapeSql(userId)}'`);
      await this.exec(`DELETE FROM dualpost_master WHERE dual_posted_by='${escapeSql(userId)}'`);
      await this.exec(`DELETE FROM notifications_master WHERE notification_sent_to='${escapeSql(userId)}'`);
      await this.exec(`DELETE FROM followers_master WHERE followed_by='${escapeSql(userId)}'`);
      await this.exec(`DELETE FROM venture_master WHERE venture_posted_by='${escapeSql(userId)}'`);
      sendLegacyJson(response, { status: "1", message: "User Deleted Successfully", data: null });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public rejectDual = async (request: Request, response: Response): Promise<void> => {
    try {
      const dualId = getLegacyString(request, "dual_id");
      const dualCaption = getLegacyString(request, "dual_caption");
      const dualPostedBy = getLegacyString(request, "dual_posted_by");
      const dualUserName = getLegacyString(request, "dual_user_name");
      const dualUpdatedBy = getLegacyString(request, "dual_updated_by");
      const dualDate = getLegacyString(request, "dual_date");
      const dualTime = getLegacyString(request, "dual_time");
      const dateTime = nowString();

      await this.exec(
        `UPDATE dualpost_master SET dual_caption='${escapeSql(dualCaption)}', dual_date='${escapeSql(dualDate)}', dual_time='${escapeSql(dualTime)}', date_time='${dateTime}', receiver_user_status = 2 WHERE dual_id='${escapeSql(dualId)}'`
      );
      const notificationTxt = `${dualUserName} Rejected your dual request`;
      await this.insertNotification(notificationTxt, dualPostedBy, "YES", dualUpdatedBy, dualId);
      sendLegacyJson(response, { status: "1", message: "Dual Updated Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public playvideo = async (_request: Request, response: Response): Promise<void> => {
    response.type("html").send(`
<html>
<body>
<script type='text/javascript' src='swfobject.js'></script>
<div id='mediaspace'>Playing FLV</div>
<object width="400" height="409" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0">
  <param name="allowscriptaccess" value="always"></param>
  <param name="file" value="cocaine">
  <embed height="500" width="650" flashvars="file=BigBuckBunny_115k.mov&amp;streamer=rtmp://184.72.239.149/vod&amp;rtmp.subscribe=false&amp;quality=best&amp;controlbar=bottom&amp;rtmp.tunneling=false&amp;frontcolor=#fff&amp;backcolor=#000&amp;stretching=exactfit&amp;autostart=true" wmode="transparent" allowfullscreen="true" allowscriptaccess="always" quality="high" src="http://s.zuuk.net/ply.swf" type="application/x-shockwave-flash"/>
</object>
</body>
</html>`);
  };

  public getComments = async (request: Request, response: Response): Promise<void> => {
    const bId = getLegacyString(request, "b_id");
    const checkTime = nowString();
    await this.exec(`UPDATE "liveStream_master" SET last_checked_time='${checkTime}' WHERE live_id = ${Number(bId)}`);
    const live = await this.queryRow<LegacyRow>(`SELECT * FROM "liveStream_master" WHERE live_id=${Number(bId)}`);
    if (!live) {
      sendLegacyJson(response, { status: "2", message: "Live broadcast stopped by broadcaster." });
      return;
    }
    const rows = await this.queryRows<LegacyRow>(
      `SELECT t.user_name,t.user_id, t.user_email, t.user_pic, t.user_name, tr.* FROM user_master t, comments_master tr WHERE tr.broadcast_id='${escapeSql(bId)}' AND CAST(tr.comment_by AS INTEGER)=t.user_id ORDER BY tr.comment_id ASC`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Comments Found successfully", data: rows, viewerCount: live.viewersCount });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No comments found for this b_id", viewerCount: live.viewersCount });
  };

  public postComment = async (request: Request, response: Response): Promise<void> => {
    try {
      const bId = getLegacyString(request, "broadcast_id");
      const commentBy = getLegacyString(request, "comment_by");
      const commentTxt = getLegacyString(request, "comment_txt");
      await this.exec(
        `INSERT INTO comments_master(comment_by, comment_txt, broadcast_id) values('${escapeSql(commentBy)}', '${escapeSql(commentTxt)}', '${escapeSql(bId)}')`
      );
      sendLegacyJson(response, { status: "1", message: "Comment Posted Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public postVenture = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getLegacyString(request, "user_id");
      const ventureTitle = getLegacyString(request, "venture_title");
      const ventureUrl = getLegacyString(request, "venture_url");
      const thumbBase64 = getLegacyString(request, "venture_thumb");
      const fileName = `${legacyRandomString(12)}.jpg`;
      const diskPath = legacyStorageDiskPath("venture", fileName);
      await writeBase64File(diskPath, thumbBase64);
      const picpath = legacyStoragePublicUrl(request, "venture", fileName);
      await this.exec(
        `INSERT INTO venture_master(venture_url, venture_posted_by, venture_thumb, venture_title) values('${escapeSql(ventureUrl)}', '${escapeSql(userId)}', '${escapeSql(picpath)}', '${escapeSql(ventureTitle)}')`
      );
      sendLegacyJson(response, { status: "1", message: "User Updated Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public uploadVenture = async (request: Request, response: Response): Promise<void> => {
    try {
      const ventureVideo = getLegacyOptionalString(request, "venture_video");
      if (!ventureVideo) {
        sendLegacyJson(response, { status: "0", message: "venture_video parameter is invalid" });
        return;
      }
      const buffer = Buffer.from(ventureVideo, "base64");
      const fileName = `${legacyRandomString(12)}.mp4`;
      const diskPath = legacyStorageDiskPath("venture", fileName);
      await writeBase64File(diskPath, ventureVideo);
      sendLegacyJson(response, { status: "1", url: legacyStoragePublicUrl(request, "venture", fileName) });
    } catch {
      sendLegacyJson(response, { status: "0", message: "ErrorVideo upload" });
    }
  };

  public getVentures = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const rows = await this.queryRows<LegacyRow>(
      `SELECT t.*, tr.* FROM user_master t, venture_master tr WHERE CAST(tr.venture_posted_by AS INTEGER)=t.user_id AND tr.is_reported='NO' AND (tr.venture_posted_by IN (SELECT following_id FROM followers_master WHERE followed_by='${escapeSql(userId)}') OR tr.venture_posted_by='${escapeSql(userId)}') ORDER BY tr.venture_id DESC LIMIT 100`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Venture Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No comments found for this b_id" });
  };

  public getVentureDet = async (request: Request, response: Response): Promise<void> => {
    const ventureId = getLegacyString(request, "venture_id");
    const rows = await this.queryRows<LegacyRow>(
      `SELECT t.*, tr.* FROM user_master t, venture_master tr WHERE CAST(tr.venture_posted_by AS INTEGER)=t.user_id AND tr.venture_id='${escapeSql(ventureId)}'`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Venture Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No comments found for this b_id" });
  };

  public getUserVenture = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const rows = await this.queryRows<LegacyRow>(
      `SELECT t.*, tr.* FROM user_master t, venture_master tr WHERE CAST(tr.venture_posted_by AS INTEGER)=t.user_id AND tr.venture_posted_by='${escapeSql(userId)}' AND tr.is_reported='NO' ORDER BY venture_id DESC`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Venture Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No comments found for this b_id" });
  };

  public searchVenture = async (request: Request, response: Response): Promise<void> => {
    const searchTxt = getLegacyString(request, "search_txt");
    const rows = await this.queryRows<LegacyRow>(
      `SELECT t.*, tr.* FROM user_master t, venture_master tr WHERE CAST(tr.venture_posted_by AS INTEGER)=t.user_id AND tr.is_reported='NO' AND LOWER(tr.venture_title) LIKE LOWER('%${escapeSql(searchTxt)}%') LIMIT 100`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Venture Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No comments found for this b_id" });
  };

  public searchLive = async (request: Request, response: Response): Promise<void> => {
    const searchTxt = getLegacyString(request, "search_txt");
    const rows = await this.queryRows<LegacyRow>(
      `SELECT t.*, tr.* FROM user_master t, "liveStream_master" tr WHERE CAST(tr.live_by AS INTEGER)=t.user_id AND tr.is_reported='NO' AND LOWER(tr.live_title) LIKE LOWER('%${escapeSql(searchTxt)}%') LIMIT 100`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Live Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No comments found for this b_id" });
  };

  public searchDualPost = async (request: Request, response: Response): Promise<void> => {
    const searchTxt = getLegacyString(request, "search_txt");
    const rows = await this.queryRows<LegacyRow>(
      `SELECT * FROM dualpost_master WHERE is_reported='NO' AND LOWER(dual_caption) LIKE LOWER('%${escapeSql(searchTxt)}%') LIMIT 100`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };

  public searchBusiness = async (request: Request, response: Response): Promise<void> => {
    const searchTxt = getLegacyString(request, "search_txt");
    const userId = getLegacyString(request, "user_id");
    const blockedRows = await this.queryRows<{ user_id: string }>(`SELECT user_id FROM blocks_master WHERE block_id='${escapeSql(userId)}'`);
    const blockedIds = blockedRows.map((row) => Number(row.user_id)).filter((entry) => Number.isFinite(entry));
    const blockedCsv = blockedIds.join(",");
    let sql = "SELECT bm.name as business_name, um.user_id, user_pic, user_email, user_full_name, user_name, user_location, user_views, user_bio, user_state from business_master bm ";
    sql += " right JOIN user_business ub on ub.business_id = bm.id ";
    sql += "left join user_master um on um.user_id=ub.user_id ";
    sql += ` WHERE (LOWER(bm.name) LIKE LOWER('%${escapeSql(searchTxt)}%')) `;
    sql += ` AND ub.user_id <> ${Number(userId)} `;
    if (blockedCsv.length > 0) {
      sql += ` AND ub.user_id NOT IN (${blockedCsv})`;
    }
    sql += " LIMIT 100";
    const rows = await this.queryRows<LegacyRow>(sql);
    if (rows.length > 0) {
      for (const row of rows) {
        row.user_businesses = await this.userBusinesses(row.user_id as string | number);
      }
      sendLegacyJson(response, { status: "1", message: "User Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No user found for the name" });
  };

  public searchUser = async (request: Request, response: Response): Promise<void> => {
    const searchTxt = getLegacyString(request, "search_txt");
    const userId = getLegacyString(request, "user_id");
    const start = getLegacyString(request, "start", "0");
    const pageSize = getLegacyString(request, "page_size", "100");
    const blockedRows = await this.queryRows<{ user_id: string }>(`SELECT user_id FROM blocks_master WHERE block_id='${escapeSql(userId)}'`);
    const blockedIds = blockedRows.map((row) => Number(row.user_id)).filter((entry) => Number.isFinite(entry));
    const blockedCsv = blockedIds.join(",");

    let sql = "SELECT user_id, user_pic, user_email, user_full_name, user_name, user_location, user_views, user_bio, user_state FROM user_master";
    sql += ` WHERE (LOWER(user_name) LIKE LOWER('${escapeSql(searchTxt)}%'))`;
    sql += ` AND user_id <> ${Number(userId)}`;
    if (blockedCsv.length > 0) {
      sql += ` AND user_id NOT IN (${blockedCsv})`;
    }
    sql += ` LIMIT ${pageSize} OFFSET ${start}`;
    const rows = await this.queryRows<LegacyRow>(sql);
    if (rows.length > 0) {
      for (const row of rows) {
        row.user_businesses = await this.userBusinesses(row.user_id as string | number);
      }
      sendLegacyJson(response, { status: "1", message: "User Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No user found for the name" });
  };

  public searchUser2 = async (request: Request, response: Response): Promise<void> => {
    const searchTxt = getLegacyString(request, "search_txt");
    const userId = getLegacyString(request, "user_id");
    const start = getLegacyString(request, "start", "0");
    const pageSize = getLegacyString(request, "page_size", "100");
    const seed = getLegacyOptionalString(request, "seed") ?? String(Date.now());
    const blockedRows = await this.queryRows<{ user_id: string }>(`SELECT user_id FROM blocks_master WHERE block_id='${escapeSql(userId)}'`);
    const blockedRows2 = await this.queryRows<{ block_id: string }>(`SELECT block_id FROM blocks_master WHERE user_id='${escapeSql(userId)}'`);
    const blockedIds = [...blockedRows.map((row) => String(row.user_id).trim()), ...blockedRows2.map((row) => String(row.block_id).trim())].filter((entry) => entry.length > 0);
    const blockedCsv = blockedIds.map((id) => `'${escapeSql(id)}'`).join(",");

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
    const rows = await this.queryRows<LegacyRow>(sql);
    if (rows.length > 0) {
      for (const row of rows) {
        row.user_businesses = await this.userBusinesses(row.user_id as string | number);
      }
      sendLegacyJson(response, { status: "1", message: "User Found successfully", data: rows, seed });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No user found for the name" });
  };

  public getUserSuggession = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const start = getLegacyString(request, "start", "0");
    const pageSize = getLegacyString(request, "page_size", "100");
    const random = getLegacyString(request, "random", "0");
    const seed = getLegacyOptionalString(request, "seed") ?? String(Date.now());
    const followingRows = await this.queryRows<{ following_id: string }>(`SELECT following_id FROM followers_master WHERE followed_by='${escapeSql(userId)}'`);
    const followingCsv = followingRows.map((row) => String(row.following_id).trim()).filter((entry) => entry.length > 0).map((id) => `'${escapeSql(id)}'`).join(",");

    const randomUsers = async (offset: string, size: string): Promise<LegacyRow[]> => {
      let sql = "SELECT user_id, user_pic, user_email, user_full_name, user_name, user_location, user_views, user_bio, user_state, user_type FROM user_master where user_id !=";
      sql += ` ${Number(userId)}`;
      if (followingCsv.length > 0) {
        sql += ` AND user_id not in(${followingCsv})`;
      }
      sql += ` ORDER BY RANDOM() LIMIT ${size} OFFSET ${offset}`;
      const rows = await this.queryRows<LegacyRow>(sql);
      for (const row of rows) {
        row.user_businesses = await this.userBusinesses(row.user_id as string | number);
      }
      return rows;
    };

    if (String(random) === "1") {
      const data = await randomUsers(start, pageSize);
      if (data.length > 0) {
        sendLegacyJson(response, { status: "1", message: "User Found successfully", data, seed, random_start: Number(start) + Number(pageSize) });
        return;
      }
      sendLegacyJson(response, { status: "0", message: "No user found for the name" });
      return;
    }

    let sql = "SELECT um.user_id, user_pic, user_email, user_full_name, user_name, user_location, user_views, user_bio, user_state, user_type";
    sql += " FROM user_master um INNER join user_contact uc on um.user_email=uc.email and uc.user_id=" + Number(userId);
    if (followingCsv.length > 0) {
      sql += ` where um.user_id not in(${followingCsv})`;
    }
    sql += ` LIMIT ${pageSize} OFFSET ${start}`;
    let rows = await this.queryRows<LegacyRow>(sql);
    for (const row of rows) {
      row.user_businesses = await this.userBusinesses(row.user_id as string | number);
    }
    if (rows.length < Number(pageSize)) {
      const randomRows = await randomUsers("0", String(Number(pageSize) - rows.length));
      rows = rows.concat(randomRows);
    }
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "User Found successfully", data: rows, seed, random_start: rows.length });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No user found for the name" });
  };

  public getFollowing = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const loggedUserId = getLegacyOptionalString(request, "logged_user_id") ?? userId;
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const includePrices = true;

    const { following } = await this.buildFollowerList(userId, loggedUserId, includePrices);
    let rows = following;
    if (start !== undefined && pageSize !== undefined) {
      rows = rows.slice(Number(start), Number(start) + Number(pageSize));
    }
    if (rows.length > 0) {
      const totalRow = await this.queryRow<{ total: number | bigint }>(`SELECT count(t.user_id) as total FROM user_master t, followers_master tr WHERE CAST(tr.following_id AS INTEGER)=t.user_id AND tr.followed_by='${escapeSql(userId)}'`);
      sendLegacyJson(response, { status: "1", data: rows, total: Number(totalRow?.total ?? 0) });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No data found" });
  };

  public getFollowers = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const loggedUserId = getLegacyOptionalString(request, "logged_user_id") ?? userId;
    const { following, followers } = await this.buildFollowerList(userId, loggedUserId, false);
    if (following.length > 0) {
      const payload: Record<string, unknown> = { status: "1", following };
      if (followers.length > 0) {
        payload.followers = followers;
      }
      sendLegacyJson(response, payload);
      return;
    }
    if (followers.length > 0) {
      sendLegacyJson(response, { status: "1", followers });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No data found" });
  };

  public getFollowers2 = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const loggedUserId = getLegacyOptionalString(request, "logged_user_id") ?? userId;
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const { followers } = await this.buildFollowerList(userId, loggedUserId, false);
    let rows = followers;
    if (start !== undefined && pageSize !== undefined) {
      rows = rows.slice(Number(start), Number(start) + Number(pageSize));
    }
    if (rows.length > 0) {
      const totalRow = await this.queryRow<{ total: number | bigint }>(`SELECT count(distinct t.user_id) as total FROM user_master t, followers_master tr WHERE CAST(tr.followed_by AS INTEGER)=t.user_id AND tr.following_id='${escapeSql(userId)}'`);
      sendLegacyJson(response, { status: "1", data: rows, total: Number(totalRow?.total ?? 0) });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No data found" });
  };

  public getUserDetail = async (request: Request, response: Response): Promise<void> => {
    const username = getLegacyString(request, "user_id");
    const isCount = Number(getLegacyOptionalString(request, "is_count") ?? 0);
    const result = await this.updateProfileViewCount(username, isCount);
    if (result === false) {
      sendLegacyJson(response, { status: "0", message: "User not found" });
      return;
    }
    const payload = await this.profileBase(username, false);
    if (!payload) {
      sendLegacyJson(response, { status: "0", message: "User not found" });
      return;
    }
    sendLegacyJson(response, { status: "1", message: "User details found successfully", data: payload });
  };

  public getUserDetail5Jan2024 = async (request: Request, response: Response): Promise<void> => {
    const username = getLegacyString(request, "user_id");
    const isCount = Number(getLegacyOptionalString(request, "is_count") ?? 0);
    const result = await this.updateProfileViewCount(username, isCount);
    if (result === false) {
      sendLegacyJson(response, { status: "0", message: "User not found" });
      return;
    }
    const payload = await this.profileBase(username, true);
    if (!payload) {
      sendLegacyJson(response, { status: "0", message: "User not found" });
      return;
    }
    sendLegacyJson(response, { status: "1", message: "User details found successfully", data: payload });
  };

  public updateProfile = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getLegacyString(request, "user_id");
      const username = getLegacyOptionalString(request, "user_name");
      const location = getLegacyOptionalString(request, "location");
      const userBio = getLegacyOptionalString(request, "user_bio");
      const userState = getLegacyOptionalString(request, "user_state");
      const hideAudience = getLegacyOptionalString(request, "hide_audience");
      const filename = getLegacyOptionalString(request, "fileName");
      let picPath = "";

      if (username) {
        const existing = await this.queryRow<LegacyRow>(`SELECT * FROM user_master WHERE user_name='${escapeSql(username.trim())}'`);
        if (existing && String(existing.user_id ?? "") !== userId) {
          sendLegacyJson(response, { status: "3", message: "This username is already taken." });
          return;
        }
      }

      if (getLegacyOptionalString(request, "profile_pic")) {
        const encoded = getLegacyString(request, "profile_pic");
        const fileName = `${legacyRandomString(10)}.jpg`;
        const diskPath = legacyStorageDiskPath("profile", fileName);
        await writeBase64File(diskPath, encoded);
        picPath = legacyStoragePublicUrl(request, "profile", fileName);
      }

      const updateParts: string[] = [];
      if (username) updateParts.push(`user_name='${escapeSql(username.trim())}'`);
      if (location) updateParts.push(`user_location='${escapeSql(location)}'`);
      if (userBio) updateParts.push(`user_bio='${escapeSql(userBio)}'`);
      if (userState) updateParts.push(`user_state='${escapeSql(userState)}'`);
      if (hideAudience !== undefined) updateParts.push(`hide_audience='${escapeSql(hideAudience)}'`);
      if (picPath.length > 0) updateParts.push(`user_pic='${escapeSql(picPath)}'`);
      if (updateParts.length > 0) {
        await this.exec(`UPDATE user_master SET ${updateParts.join(",")} WHERE user_id='${escapeSql(userId)}'`);
      }
      if (picPath.length > 0) {
        await this.exec(`UPDATE dualpost_master SET dual_posted_pic='${escapeSql(picPath)}' WHERE dual_posted_by='${escapeSql(userId)}'`);
        await this.exec(`UPDATE dualpost_master SET dual_linked_profile_pic='${escapeSql(picPath)}' WHERE dual_linked_to='${escapeSql(userId)}'`);
      }

      const row = await this.profileBase(userId, false);
      if (!row) {
        sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
        return;
      }

      row.categories = await this.categories();
      row.interests = await this.interests();
      row.businesses = await this.businesses();
      row.user_categories = await this.queryRows<{ category_id: number }>(`SELECT * FROM user_category where user_id='${escapeSql(userId)}'`).then((rows) => rows.map((entry) => entry.category_id));
      row.user_interests = await this.queryRows<{ interest_id: number }>(`SELECT * FROM user_interest where user_id='${escapeSql(userId)}'`).then((rows) => rows.map((entry) => entry.interest_id));
      row.user_businesses = await this.queryRows<{ business_id: number }>(`SELECT * FROM user_business where user_id='${escapeSql(userId)}'`).then((rows) => rows.map((entry) => entry.business_id));

      sendLegacyJson(response, { status: "1", message: "User Updated Successfully", data: row });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public updateProfileViewCountRoute = async (_request: Request, response: Response): Promise<void> => {
    response.status(200).send("");
  };

  public addVideoPost = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getLegacyString(request, "user_id");
      const userName = getLegacyString(request, "user_name");
      const userPic = getLegacyString(request, "user_pic");
      const title = getLegacyString(request, "video_title");
      const cost = getLegacyString(request, "video_cost");
      const linkedTo = getLegacyString(request, "dual_linked_to", "-1");
      const linkedName = getLegacyString(request, "dual_linked_name", "NA");
      const linkedPic = getLegacyString(request, "dual_linked_propic", "NA");
      const dualDate = getLegacyOptionalString(request, "dual_date") ?? "";
      const dualTime = getLegacyOptionalString(request, "dual_time") ?? "";
      const receiverNotes = getLegacyOptionalString(request, "receiver_notes") ?? "";
      const receiverUserStatus = getLegacyOptionalString(request, "receiver_user_status") ?? "0";
      const collabPrice = getLegacyOptionalString(request, "collab_price") ?? "0";
      const cardId = getLegacyOptionalString(request, "card_id") ?? "";
      const taggedUserIds = getLegacyOptionalString(request, "tagged_user_ids") ?? "";
      const categoryIds = numericList(getLegacyOptionalString(request, "category_ids") ?? "");
      const interestIds = numericList(getLegacyOptionalString(request, "interest_ids") ?? "");
      const thumbnail = this.fileFromRequest(request, "video_thumb");
      const video = this.fileFromRequest(request, "video");

      if (!video) {
        sendLegacyJson(response, { status: "0", message: "Error while adding record in database File not found." });
        return;
      }

      let thumbUrl = "";
      if (thumbnail) {
        const thumbFileName = `${legacyRandomString(10)}.jpg`;
        const thumbPath = path.join(env.legacyThumbnailsRoot, thumbFileName);
        await fs.mkdir(env.legacyThumbnailsRoot, { recursive: true });
        await fs.writeFile(thumbPath, thumbnail.buffer);
        thumbUrl = `${request.secure ? "https" : "http"}://${request.headers.host ?? "localhost:3000"}/categories/thumbnails/${thumbFileName}`;
      }

      const videoExt = path.extname(video.originalname) || ".mov";
      const videoFileName = `${legacyRandomString(10)}${videoExt}`;
      const videoPath = path.join(env.legacyVideoPostsRoot, videoFileName);
      await fs.mkdir(env.legacyVideoPostsRoot, { recursive: true });
      await fs.writeFile(videoPath, video.buffer);
      const videoUrl = `${request.secure ? "https" : "http"}://${request.headers.host ?? "localhost:3000"}/categories/videoPosts/${videoFileName}`;

      const dateTime = nowString();
      const inserted = await this.queryRow<LegacyRow>(
        `INSERT INTO dualpost_master(dual_posted_by, dual_image, dual_caption, dual_posted_name, dual_posted_pic, video_url, video_cost, date_time, dual_type, dual_linked_to, dual_linked_name, dual_linked_profile_pic, dual_date, dual_time, receiver_notes, receiver_user_status, card_id, collab_price, payment_status, tagged_users)
         VALUES('${escapeSql(userId)}', '${escapeSql(thumbUrl)}', '${escapeSql(title)}', '${escapeSql(userName)}', '${escapeSql(userPic)}', '${escapeSql(videoUrl)}', '${escapeSql(cost)}', '${dateTime}', 2, '${escapeSql(linkedTo)}', '${escapeSql(linkedName)}', '${escapeSql(linkedPic)}', '${escapeSql(dualDate)}', '${escapeSql(dualTime)}', '${escapeSql(receiverNotes)}', '${escapeSql(receiverUserStatus)}', '${escapeSql(cardId)}', '${escapeSql(collabPrice)}', 'Pending', '${escapeSql(taggedUserIds)}') RETURNING *`
      );

      if (!inserted) {
        sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
        return;
      }

      const dualId = String(inserted.dual_id);
      if (categoryIds.length > 0) {
        await this.exec(`INSERT INTO dualpost_category(dual_id, category_id) VALUES ${categoryIds.map((id) => `(${dualId}, ${id})`).join(",")}`);
      }
      if (interestIds.length > 0) {
        await this.exec(`INSERT INTO dualpost_interest(dual_id, interest_id) VALUES ${interestIds.map((id) => `(${dualId}, ${id})`).join(",")}`);
      }
      if (linkedName !== "NA") {
        const notificationTxt = `${userName} wants to cross-brand with you 🤝.`;
        await this.insertNotification(notificationTxt, linkedTo, "YES", userId, dualId);
      } else if (taggedUserIds.length > 0) {
        const notificationTxt = `${userName} just tagged you`;
        for (const taggedId of csvToList(taggedUserIds)) {
          await this.insertNotification(notificationTxt, taggedId, "YES", userId, dualId);
        }
      }
      sendLegacyJson(response, { status: "1", message: "Video Created Successfully", data: inserted });
    } catch (error) {
      sendLegacyJson(response, { status: "0", message: `Error while adding record in database ${error instanceof Error ? error.message : ""}`.trim() });
    }
  };

  public addVideoPostLegacy = async (request: Request, response: Response): Promise<void> => {
    await this.addVideoPost(request, response);
  };

  public postDualPost = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getLegacyString(request, "user_id");
      const userName = getLegacyString(request, "user_name");
      const userPic = getLegacyString(request, "user_pic");
      const title = getLegacyString(request, "dualP_title");
      const linkedTo = getLegacyString(request, "dual_linked_to");
      const dualDate = getLegacyString(request, "dual_date");
      const dualTime = getLegacyString(request, "dual_time");
      const linkedName = getLegacyString(request, "dual_linked_name", "NA");
      const linkedPic = getLegacyString(request, "dual_linked_propic", "NA");
      const receiverNotes = getLegacyOptionalString(request, "receiver_notes") ?? "";
      const receiverUserStatus = getLegacyOptionalString(request, "receiver_user_status") ?? "0";
      const collabPrice = getLegacyOptionalString(request, "collab_price") ?? "0";
      const cardId = getLegacyOptionalString(request, "card_id") ?? "";
      const taggedUserIds = getLegacyOptionalString(request, "tagged_user_ids") ?? "";
      const categoryIds = numericList(getLegacyOptionalString(request, "category_ids") ?? "");
      const interestIds = numericList(getLegacyOptionalString(request, "interest_ids") ?? "");
      const profilePic = getLegacyString(request, "dual_pic");
      const base64 = Buffer.from(profilePic, "base64");
      const fileName = `${legacyRandomString(12)}.jpg`;
      const diskPath = legacyStorageDiskPath("dualPosts", fileName);
      await fs.mkdir(legacyStorageDiskPath("dualPosts"), { recursive: true });
      await fs.writeFile(diskPath, base64);
      const picPath = legacyStoragePublicUrl(request, "dualPosts", fileName);
      const dateTime = nowString();
      const row = await this.queryRow<LegacyRow>(
        `INSERT INTO dualpost_master(dual_image, dual_posted_by, dual_linked_to, dual_linked_name, dual_linked_profile_pic, dual_caption, dual_posted_name, dual_posted_pic, dual_date, dual_time, date_time, receiver_notes, receiver_user_status, card_id, collab_price, payment_status, tagged_users)
         VALUES('${escapeSql(picPath)}', '${escapeSql(userId)}', '${escapeSql(linkedTo)}', '${escapeSql(linkedName)}', '${escapeSql(linkedPic)}', '${escapeSql(title)}', '${escapeSql(userName)}', '${escapeSql(userPic)}', '${escapeSql(dualDate)}', '${escapeSql(dualTime)}', '${dateTime}', '${escapeSql(receiverNotes)}', '${escapeSql(receiverUserStatus)}', '${escapeSql(cardId)}', '${escapeSql(collabPrice)}', 'Pending', '${escapeSql(taggedUserIds)}') RETURNING *`
      );
      if (!row) {
        sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
        return;
      }
      const dualId = String(row.dual_id);
      if (categoryIds.length > 0) {
        await this.exec(`INSERT INTO dualpost_category(dual_id, category_id) VALUES ${categoryIds.map((id) => `(${dualId}, ${id})`).join(",")}`);
      }
      if (interestIds.length > 0) {
        await this.exec(`INSERT INTO dualpost_interest(dual_id, interest_id) VALUES ${interestIds.map((id) => `(${dualId}, ${id})`).join(",")}`);
      }
      if (linkedName !== "NA") {
        await this.insertNotification(`${userName} wants to post together`, linkedTo, "YES", userId, dualId);
      } else if (taggedUserIds.length > 0) {
        const notificationTxt = `${userName} just tagged you`;
        for (const taggedId of csvToList(taggedUserIds)) {
          await this.insertNotification(notificationTxt, taggedId, "YES", userId, dualId);
        }
      }
      sendLegacyJson(response, { status: "1", message: "Dual Posted Successfully" });
    } catch (error) {
      sendLegacyJson(response, { status: "0", message: `Error while adding record in database${error instanceof Error ? error.message : ""}` });
    }
  };

  public updateDual = async (request: Request, response: Response): Promise<void> => {
    try {
      const dualId = getLegacyString(request, "dual_id");
      const dualCaption = getLegacyString(request, "dual_caption");
      const dualPostedBy = getLegacyString(request, "dual_posted_by");
      const dualUserName = getLegacyString(request, "dual_user_name");
      const dualUpdatedBy = getLegacyString(request, "dual_updated_by");
      const dualDate = getLegacyString(request, "dual_date");
      const dualTime = getLegacyString(request, "dual_time");
      const dateTime = nowString();
      const row = await this.queryRow<LegacyRow>(`SELECT * FROM dualpost_master WHERE dual_id='${escapeSql(dualId)}'`);
      if (!row) {
        sendLegacyJson(response, { status: "0", message: "Dual not found" });
        return;
      }
      const userDetails = await this.queryRow<LegacyRow>(`SELECT * FROM user_master WHERE user_id='${escapeSql(String(row.dual_linked_to ?? ""))}'`);
      const loginUserDetails = await this.queryRow<LegacyRow>(`SELECT * FROM user_master WHERE user_id='${escapeSql(String(row.dual_posted_by ?? ""))}'`);
      const collabPrice = Number(row.collab_price ?? 0);
      let queryUpdate = "";
      if (collabPrice > 0) {
        if (String(row.payment_status ?? "") === "Pending") {
          if (!userDetails || !String(userDetails.stripe_account_id ?? "").length) {
            sendLegacyJson(response, { status: "0", message: "Dual user stripe account not setup!" });
            return;
          }
          queryUpdate = ",payment_status='Complete',payment_intent_id='manual_compat'";
        }
      } else {
        queryUpdate = ",payment_status='Complete'";
      }
      await this.exec(
        `UPDATE dualpost_master SET dual_caption='${escapeSql(dualCaption)}', dual_date='${escapeSql(dualDate)}', dual_time='${escapeSql(dualTime)}', date_time='${dateTime}', receiver_user_status = 1 ${queryUpdate} WHERE dual_id='${escapeSql(dualId)}'`
      );
      const notificationTxt = `${dualUserName} just wrote a caption to your photo 👍.`;
      await this.insertNotification(notificationTxt, dualPostedBy, "YES", dualUpdatedBy, dualId);
      if (loginUserDetails) {
        const tagged = String(row.tagged_users ?? "");
        if (tagged.length > 0) {
          for (const taggedId of csvToList(tagged)) {
            await this.insertNotification(`${String(row.dual_posted_name ?? "")} just tagged you`, taggedId, "YES", dualPostedBy, dualId);
          }
        }
      }
      sendLegacyJson(response, { status: "1", message: "Dual Updated Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public updateDualLegacy = async (request: Request, response: Response): Promise<void> => {
    try {
      const dualId = getLegacyString(request, "dual_id");
      const dualCaption = getLegacyString(request, "dual_caption");
      const dualPostedBy = getLegacyString(request, "dual_posted_by");
      const dualUserName = getLegacyString(request, "dual_user_name");
      const dualUpdatedBy = getLegacyString(request, "dual_updated_by");
      const dualDate = getLegacyString(request, "dual_date");
      const dualTime = getLegacyString(request, "dual_time");
      const dateTime = nowString();
      await this.exec(
        `UPDATE dualpost_master SET dual_caption='${escapeSql(dualCaption)}', dual_date='${escapeSql(dualDate)}', dual_time='${escapeSql(dualTime)}', date_time='${dateTime}' WHERE dual_id='${escapeSql(dualId)}'`
      );
      await this.insertNotification(`${dualUserName} just wrote a caption to your photo 👍.`, dualPostedBy, "YES", dualUpdatedBy, dualId);
      sendLegacyJson(response, { status: "1", message: "Dual Updated Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public delDualPost = async (request: Request, response: Response): Promise<void> => {
    try {
      const dualId = getLegacyString(request, "dualid");
      if (dualId.length <= 0) {
        sendLegacyJson(response, { status: "0", message: "Invalid Request" });
        return;
      }
      const row = await this.queryRow<LegacyRow>(`SELECT dual_id, dual_image, video_url, dual_type FROM dualpost_master WHERE dual_id=${Number(dualId)}`);
      if (row) {
        if (Number(row.dual_type ?? 0) === 2) {
          if (String(row.dual_image ?? "").length > 0) {
            await fs.rm(path.join(env.legacyThumbnailsRoot, path.basename(String(row.dual_image))), { force: true });
          }
          if (String(row.video_url ?? "").length > 0) {
            await fs.rm(path.join(env.legacyVideoPostsRoot, path.basename(String(row.video_url))), { force: true });
          }
        } else if (String(row.dual_image ?? "").length > 0) {
          await fs.rm(path.join(legacyStorageDiskPath("dualPosts"), path.basename(String(row.dual_image))), { force: true });
        }
      }
      await this.exec(`DELETE FROM notifications_master WHERE notification_dual_id='${escapeSql(dualId)}'`);
      await this.exec(`DELETE FROM dualpost_category WHERE dual_id='${escapeSql(dualId)}'`);
      await this.exec(`DELETE FROM dualpost_master WHERE dual_id='${escapeSql(dualId)}'`);
      sendLegacyJson(response, { status: "1", message: "Dual Deleted Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public getSaveDuals = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const rows = await this.queryRows<LegacyRow>(
      `SELECT dp.*, CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved, CASE WHEN sm.saved_by IS NULL THEN FALSE ELSE TRUE END as is_saved FROM dualpost_master dp LEFT JOIN save_master sm on dp.dual_id=sm.dual_id LEFT JOIN love_master lm on dp.dual_id=lm.dual_id and lm.loved_by=${Number(userId)} where sm.saved_by=${Number(userId)} order by sm.date_time DESC`
    );
    if (rows.length > 0) {
      for (const row of rows) {
        const loveCount = await this.queryRow<{ loved_cnt: number | bigint }>(`SELECT count(*) AS loved_cnt FROM love_master WHERE dual_id=${Number(row.dual_id)}`);
        row.loved_cnt = Number(loveCount?.loved_cnt ?? 0);
      }
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };

  public getLoveDuals = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const rows = await this.queryRows<LegacyRow>(
      `SELECT dp.*, CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved FROM dualpost_master dp LEFT JOIN love_master lm on dp.dual_id=lm.dual_id where lm.loved_by=${Number(userId)} order by lm.date_time DESC`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };

  public getSuggestedVideos = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const followingRows = await this.queryRows<{ following_id: string }>(`SELECT following_id FROM followers_master WHERE followed_by='${escapeSql(userId)}'`);
    const followingCsv = followingRows.map((row) => String(row.following_id).trim()).filter((entry) => entry.length > 0).map((id) => `'${escapeSql(id)}'`).join(",");
    let sql = "SELECT dp.*, um.video_price ,um.image_price, um.story_price,um.is_free_promo,um.user_type FROM dualpost_master dp";
    sql += " LEFT JOIN user_master um on CAST(dp.dual_posted_by AS INTEGER) = um.user_id ";
    sql += " WHERE is_reported='NO'";
    sql += ` AND dual_posted_by <> '${escapeSql(userId)}'`;
    sql += " AND dual_caption!='Not Provided'";
    if (followingCsv.length > 0) {
      sql += ` AND dual_posted_by NOT IN (${followingCsv})`;
    }
    sql += " AND dual_type = 2 ORDER BY RANDOM() LIMIT 50";
    const rows = await this.queryRows<LegacyRow>(sql);
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Videos Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No videos found for the name" });
  };

  public getBrowse = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const categoryIds = getLegacyString(request, "category_ids");
    const start = getLegacyString(request, "start", "0");
    const pageSize = getLegacyString(request, "page_size", "100");
    const rows = await this.dualFeedRows(userId, {
      categoryIds,
      start,
      pageSize,
      includeSaved: false,
      includeLoveCount: false,
      type: "browse",
      queryMessage: "AND dp.dual_linked_to<=0"
    });
    if (rows.rows.length > 0) {
      const data = rows.rows.map((row) => {
        const postedBy = String(row.dual_posted_by ?? "");
        return { ...row, dual_posted_name: row.dual_posted_name ?? postedBy };
      });
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data, total_posts: rows.total });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found" });
  };

  public getBrowse2 = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const categoryIds = getLegacyString(request, "category_ids");
    const start = getLegacyString(request, "start", "0");
    const pageSize = getLegacyString(request, "page_size", "100");
    const type = getLegacyString(request, "type");
    const screen = getLegacyString(request, "screen");
    const seed = getLegacyOptionalString(request, "seed") ?? String(Date.now());
    const random = getLegacyOptionalString(request, "random") ?? "0";
    const rows = await this.dualFeedRows(userId, {
      categoryIds,
      start,
      pageSize,
      includeSaved: true,
      includeLoveCount: true,
      includeLinkedPrices: true,
      random,
      seed,
      type,
      screen,
      ageFilterDays: 5,
      queryMessage: "AND dual_linked_to=-1"
    });
    if (rows.rows.length > 0) {
      const grouped: Record<string, LegacyRow> = {};
      for (const row of rows.rows) {
        const owner = String(row.dual_posted_by ?? "");
        if (!grouped[owner]) {
          grouped[owner] = {
            dual_posted_by: row.dual_posted_by,
            dual_posted_pic: row.dual_posted_pic,
            dual_posted_name: row.dual_posted_name,
            dual_posts: []
          };
        }
        (grouped[owner].dual_posts as LegacyRow[]).push(row);
      }
      sendLegacyJson(response, { status: "1", message: "Post Found successfully", data: Object.values(grouped) });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No post found" });
  };

  public getBrowse20032020 = async (request: Request, response: Response): Promise<void> => {
    await this.getBrowse2(request, response);
  };

  public getPostByInterest = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const interestIds = getLegacyString(request, "interest_ids");
    if (numericList(interestIds).length <= 0) {
      sendLegacyJson(response, { status: "0", message: "Please select atleast one interest" });
      return;
    }
    const start = getLegacyString(request, "start", "0");
    const pageSize = getLegacyString(request, "page_size", "100");
    const seed = getLegacyOptionalString(request, "seed") ?? String(Date.now());
    const random = getLegacyOptionalString(request, "random") ?? "0";
    const rows = await this.dualFeedRows(userId, {
      interestIds,
      start,
      pageSize,
      includeSaved: true,
      includeLoveCount: true,
      includeLinkedPrices: true,
      random,
      seed
    });
    if (rows.rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows.rows, total_posts: rows.total, seed: rows.seed });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Post found for this interest" });
  };

  public getUserDuals = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const loggedUserId = getLegacyOptionalString(request, "logged_user_id");
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const type = getLegacyOptionalString(request, "type") ?? "both";
    const sqlType = type === "collab" ? " AND dual_linked_to>0 " : type === "normal" ? " AND dual_linked_to<0 " : "";
    let sql = "";
    let sqlTotal = "";
    if (loggedUserId) {
      sql = `SELECT dp.*, CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved, CASE WHEN sm.saved_by IS NULL THEN FALSE ELSE TRUE END as is_saved, COALESCE((SELECT count(*) FROM love_master lm2 WHERE lm2.dual_id=dp.dual_id),0) AS loved_cnt, um.video_price ,um.image_price ,um.story_price,um.is_free_promo, um2.video_price as linked_video_price,um2.image_price as linked_image_price,um2.story_price as linked_story_price,um2.is_free_promo as linked_is_free_promo FROM dualpost_master dp LEFT JOIN user_master um on CAST(dp.dual_posted_by AS INTEGER)=um.user_id LEFT JOIN user_master um2 on dp.dual_linked_to=um2.user_id LEFT JOIN save_master sm on dp.dual_id=sm.dual_id and sm.saved_by=${Number(loggedUserId)} LEFT JOIN love_master lm on dp.dual_id=lm.dual_id and lm.loved_by=${Number(loggedUserId)} WHERE (dual_posted_by='${escapeSql(userId)}' OR dual_linked_to=${Number(userId)}) AND dual_caption!='Not Provided' AND is_reported='NO' ${sqlType} ORDER BY dual_id DESC`;
      sqlTotal = `SELECT count(dp.dual_id) as total FROM dualpost_master dp WHERE (dual_posted_by='${escapeSql(userId)}' OR dual_linked_to=${Number(userId)}) AND dual_caption!='Not Provided' AND is_reported='NO' ${sqlType}`;
    } else {
      sql = `SELECT * FROM dualpost_master WHERE dual_posted_by='${escapeSql(userId)}' AND dual_caption!='Not Provided' AND is_reported='NO' ${sqlType} ORDER BY dual_id DESC`;
      sqlTotal = `SELECT count(dual_id) as total FROM dualpost_master WHERE dual_posted_by='${escapeSql(userId)}' AND dual_caption!='Not Provided' AND is_reported='NO' ${sqlType}`;
    }
    if (start !== undefined && pageSize !== undefined) {
      sql += ` LIMIT ${pageSize} OFFSET ${start}`;
    }
    const rows = await this.queryRows<LegacyRow>(sql);
    if (rows.length > 0) {
      let total = 0;
      if (start !== undefined && pageSize !== undefined) {
        const totalRow = await this.queryRow<{ total: number | bigint }>(sqlTotal);
        total = Number(totalRow?.total ?? 0);
      }
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows, total });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };

  public getUserDuals2 = async (request: Request, response: Response): Promise<void> => {
    await this.getUserDuals(request, response);
  };

  public getDuals = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const rows = await this.queryRows<LegacyRow>(
      `SELECT dp.*, CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved FROM dualpost_master dp LEFT JOIN love_master lm on dp.dual_id=lm.dual_id and lm.loved_by=${Number(userId)} WHERE dual_caption!='Not Provided' AND is_reported='NO' AND dual_type=1 AND (dual_posted_by IN (SELECT following_id FROM followers_master WHERE followed_by='${escapeSql(userId)}') OR dual_posted_by='${escapeSql(userId)}') ORDER BY date_time DESC LIMIT 100`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };

  public getDuals1 = async (request: Request, response: Response): Promise<void> => {
    await this.getDuals(request, response);
  };

  public getDuals2 = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const type = getLegacyString(request, "type");
    const screen = getLegacyString(request, "screen");
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const rows = await this.queryRows<LegacyRow>(
      `SELECT dp.*, CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved, CASE WHEN sm.saved_by IS NULL THEN FALSE ELSE TRUE END as is_saved, COALESCE((SELECT count(*) FROM love_master lm2 WHERE lm2.dual_id=dp.dual_id),0) AS loved_cnt FROM dualpost_master dp LEFT JOIN save_master sm on dp.dual_id=sm.dual_id and sm.saved_by=${Number(userId)} LEFT JOIN love_master lm on dp.dual_id=lm.dual_id and lm.loved_by=${Number(userId)} WHERE dual_caption!='Not Provided' AND is_reported='NO' AND dual_type=1 AND (dual_posted_by IN (SELECT following_id FROM followers_master WHERE followed_by='${escapeSql(userId)}') OR dual_posted_by='${escapeSql(userId)}') ORDER BY date_time DESC${start !== undefined && pageSize !== undefined ? ` LIMIT ${pageSize} OFFSET ${start}` : type === "post" && screen === "home" ? " LIMIT 4" : ""}`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows, total_posts: rows.length });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };

  public getDuals3 = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const type = getLegacyString(request, "type");
    const screen = getLegacyString(request, "screen");
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const seed = getLegacyOptionalString(request, "seed") ?? String(Date.now());
    const random = getLegacyOptionalString(request, "random") ?? "0";
    const rows = await this.queryRows<LegacyRow>(
      `SELECT dp.*, CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved, CASE WHEN sm.saved_by IS NULL THEN FALSE ELSE TRUE END as is_saved FROM dualpost_master dp LEFT JOIN save_master sm on dp.dual_id=sm.dual_id and sm.saved_by=${Number(userId)} LEFT JOIN love_master lm on dp.dual_id=lm.dual_id and lm.loved_by=${Number(userId)} WHERE dual_caption!='Not Provided' AND is_reported='NO' AND (dual_posted_by='${escapeSql(userId)}' OR dual_linked_to=${Number(userId)}) ORDER BY ${String(random) === "1" ? "RANDOM()" : "date_time DESC"}${start !== undefined && pageSize !== undefined ? ` LIMIT ${pageSize} OFFSET ${start}` : type === "post" && screen === "home" ? " LIMIT 4" : ""}`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows, total_posts: rows.length, seed });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };

  public getDuals4 = async (request: Request, response: Response): Promise<void> => {
    await this.getDuals3(request, response);
  };

  public getDuals4Legacy = async (request: Request, response: Response): Promise<void> => {
    await this.getDuals3(request, response);
  };

  public getPostFeed = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const type = getLegacyString(request, "type");
    const screen = getLegacyString(request, "screen");
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const rows = await this.queryRows<LegacyRow>(
      `SELECT dp.*, CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved, CASE WHEN sm.saved_by IS NULL THEN FALSE ELSE TRUE END as is_saved, COALESCE((SELECT count(*) FROM love_master lm2 WHERE lm2.dual_id=dp.dual_id),0) AS loved_cnt, um.video_price ,um.image_price ,um.story_price,um.is_free_promo, um2.video_price as linked_video_price,um2.image_price as linked_image_price,um2.story_price as linked_story_price,um2.is_free_promo as linked_is_free_promo FROM dualpost_master dp LEFT JOIN user_master um on CAST(dp.dual_posted_by AS INTEGER)=um.user_id LEFT JOIN user_master um2 on dp.dual_linked_to=um2.user_id LEFT JOIN save_master sm on dp.dual_id=sm.dual_id and sm.saved_by=${Number(userId)} LEFT JOIN love_master lm on dp.dual_id=lm.dual_id and lm.loved_by=${Number(userId)} WHERE dual_caption!='Not Provided' AND is_reported='NO' AND (dual_posted_by='${escapeSql(userId)}' OR dual_linked_to=${Number(userId)}) ORDER BY dual_id DESC${start !== undefined && pageSize !== undefined ? ` LIMIT ${pageSize} OFFSET ${start}` : type === "post" && screen === "home" ? " LIMIT 4" : ""}`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows, total_posts: rows.length });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };

  public getPostFeed2 = async (request: Request, response: Response): Promise<void> => {
    await this.getPostFeed(request, response);
  };

  public getPostFeed25Jan2024 = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const type = getLegacyString(request, "type");
    const screen = getLegacyString(request, "screen");
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const seed = getLegacyOptionalString(request, "seed") ?? String(Date.now());
    const random = getLegacyOptionalString(request, "random") ?? "0";
    const rows = await this.queryRows<LegacyRow>(
      `SELECT dp.*, CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved, CASE WHEN sm.saved_by IS NULL THEN FALSE ELSE TRUE END as is_saved FROM dualpost_master dp LEFT JOIN save_master sm on dp.dual_id=sm.dual_id and sm.saved_by=${Number(userId)} LEFT JOIN love_master lm on dp.dual_id=lm.dual_id and lm.loved_by=${Number(userId)} WHERE dual_caption!='Not Provided' AND is_reported='NO' AND (dual_posted_by='${escapeSql(userId)}' OR dual_linked_to=${Number(userId)}) ORDER BY ${String(random) === "1" ? "RANDOM()" : "date_time DESC"}${start !== undefined && pageSize !== undefined ? ` LIMIT ${pageSize} OFFSET ${start}` : type === "post" && screen === "home" ? " LIMIT 4" : ""}`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows, total_posts: rows.length, seed });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };

  public sendNotification = async (request: Request, response: Response): Promise<void> => {
    await this.sendLegacyPush(request, false);
    response.type("html").send("<p>Message successfully delivered</p>");
  };

  public sendNotificationDev = async (request: Request, response: Response): Promise<void> => {
    await this.sendLegacyPush(request, true);
    response.type("html").send("<p>Message successfully delivered</p>");
  };

  public test = async (_request: Request, response: Response): Promise<void> => {
    response.type("html").send("<html><body><pre>phpinfo()</pre></body></html>");
  };

  public testCurl = async (_request: Request, response: Response): Promise<void> => {
    response.type("html").send("CURL is available on your web server\nNotifiation sent");
  };

  public testWowza = async (_request: Request, response: Response): Promise<void> => {
    response.type("html").send("Required field(s) is missing");
  };

  public testPush = async (_request: Request, response: Response): Promise<void> => {
    response.type("html").send("<p>Message successfully delivered</p>");
  };

  public startstream = async (request: Request, response: Response): Promise<void> => {
    const streamName = getLegacyOptionalString(request, "stream_name");
    if (!streamName) {
      sendLegacyJson(response, { success: 0, message: "Required field(s) is missing" });
      return;
    }
    try {
      const payload = await this.wowzaService.startSandboxStream(streamName);
      response.send(payload);
    } catch (error) {
      response.send(`Error:${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  public sqliteUsers = async (request: Request, response: Response): Promise<void> => {
    const envPath = process.env.DROOP_SQLITE_PATH ?? "/Users/kunalrohilla/Downloads/storage.sqlite";
    try {
      await fs.access(envPath);
    } catch {
      response.status(500).json({
        status: 0,
        message: "SQLite database file was not found.",
        database_path: envPath
      });
      return;
    }

    const requestedUsername = (getLegacyOptionalString(request, "username") ?? "").trim();
    const parsedLimit = Number(getLegacyOptionalString(request, "limit") ?? "50");
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 500) : 50;
    const includeHash = (getLegacyOptionalString(request, "include_hash") ?? "1") !== "0";
    const columns = [
      "username",
      "real_name",
      "alternate_email",
      "phone_number",
      "domain",
      "type",
      "guid",
      "avatar_url",
      "digest_auth_hash",
      "synced_password",
      "has_invite",
      "invite_expiration"
    ];
    if (includeHash) {
      columns.push("password_hash");
    }

    let sql = `SELECT ${columns.join(", ")} FROM users`;
    if (requestedUsername.length > 0) {
      sql += ` WHERE username = '${escapeSql(requestedUsername)}'`;
    }
    sql += ` ORDER BY username ASC LIMIT ${limit}`;

    let users: LegacyRow[];
    try {
      const { stdout } = await execFileAsync("sqlite3", [envPath, "-json", sql], { maxBuffer: 1024 * 1024 });
      users = stdout.trim().length > 0 ? (JSON.parse(stdout) as LegacyRow[]) : [];
    } catch (error) {
      response.status(500).json({
        status: 0,
        message: "Failed to query users table.",
        database_path: envPath,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return;
    }

    const payload: Record<string, unknown> = {
      status: 1,
      database_path: envPath,
      requested_username: requestedUsername,
      returned_count: users.length,
      users
    };

    const submittedPassword = getLegacyOptionalString(request, "password");
    if (submittedPassword && requestedUsername.length > 0 && users.length === 1 && includeHash) {
      const storedHash = String(users[0].password_hash ?? "");
      try {
        const { stdout } = await execFileAsync(
          "php",
          ["-r", "echo password_verify($argv[1], $argv[2]) ? '1' : '0';", submittedPassword, storedHash],
          { maxBuffer: 1024 * 1024 }
        );
        payload.password_check = {
          password_verify_match: stdout.trim() === "1"
        };
      } catch {
        payload.password_check = {
          password_verify_match: false
        };
      }
    }

    response.status(200).json(payload);
  };
}

function requestIpSeed(): string {
  return "127001";
}
