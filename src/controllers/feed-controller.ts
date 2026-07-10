/**
 * Purpose: Recreate legacy feed and dual listing endpoints while preserving PHP-compatible payloads.
 * Expected request body: user_id, category_ids, interest_ids, start, page_size, type, screen, random, and seed.
 * Expected query parameters: Legacy clients may send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status, message, data, total_posts, total, and seed keys.
 */
import { Request, Response } from "express";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { sendLegacyJson } from "../lib/legacy-response";
import { LegacyRow } from "../lib/legacy-row";
import { escapeSql, numericList } from "../lib/legacy-sql";
import { LegacyBaseController, LegacyControllerDependencies } from "./base-controller";

export class LegacyFeedController extends LegacyBaseController {
  public constructor(dependencies: LegacyControllerDependencies) {
    super(dependencies);
  }

  public getSaveDuals = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const rows = await this.feedRepository.savedDuals(userId);
    if (rows.length > 0) {
      for (const row of rows) {
        row.loved_cnt = await this.feedRepository.loveCount(String(row.dual_id ?? 0));
      }
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };

  public getLoveDuals = async (request: Request, response: Response): Promise<void> => {
    const rows = await this.feedRepository.lovedDuals(getLegacyString(request, "user_id"));
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };

  public getSuggestedVideos = async (request: Request, response: Response): Promise<void> => {
    const rows = await this.feedRepository.suggestedVideos(getLegacyString(request, "user_id"));
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
    const rows = await this.feedRepository.dualFeedRows(userId, {
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
    const rows = await this.feedRepository.dualFeedRows(userId, {
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
    const rows = await this.feedRepository.dualFeedRows(userId, {
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
      sendLegacyJson(response, {
        status: "1",
        message: "Dual Post Found successfully",
        data: rows.rows,
        total_posts: rows.total,
        seed: rows.seed
      });
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
    const rows = await this.sharedRepository.queryMany<LegacyRow>(sql);
    if (rows.length > 0) {
      let total = 0;
      if (start !== undefined && pageSize !== undefined) {
        const totalRow = await this.sharedRepository.queryOne<{ total: number | bigint }>(sqlTotal);
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
    const rows = await this.sharedRepository.queryMany<LegacyRow>(
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
    const rows = await this.sharedRepository.queryMany<LegacyRow>(
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
    const type = getLegacyOptionalString(request, "type") ?? "";
    const screen = getLegacyOptionalString(request, "screen") ?? "";
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const seed = getLegacyOptionalString(request, "seed") ?? String(Date.now());
    const random = getLegacyOptionalString(request, "random") ?? "0";
    const result = await this.feedRepository.homeDualFeedRows(userId, {
      start,
      pageSize,
      random,
      seed,
      type,
      screen
    });
    if (result.rows.length > 0) {
      sendLegacyJson(response, {
        status: "1",
        message: "Dual Post Found successfully",
        data: result.rows,
        total_posts: result.total,
        seed: result.seed
      });
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
    const rows = await this.sharedRepository.queryMany<LegacyRow>(
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
    const rows = await this.sharedRepository.queryMany<LegacyRow>(
      `SELECT dp.*, CASE WHEN lm.loved_by IS NULL THEN FALSE ELSE TRUE END as is_loved, CASE WHEN sm.saved_by IS NULL THEN FALSE ELSE TRUE END as is_saved FROM dualpost_master dp LEFT JOIN save_master sm on dp.dual_id=sm.dual_id and sm.saved_by=${Number(userId)} LEFT JOIN love_master lm on dp.dual_id=lm.dual_id and lm.loved_by=${Number(userId)} WHERE dual_caption!='Not Provided' AND is_reported='NO' AND (dual_posted_by='${escapeSql(userId)}' OR dual_linked_to=${Number(userId)}) ORDER BY ${String(random) === "1" ? "RANDOM()" : "date_time DESC"}${start !== undefined && pageSize !== undefined ? ` LIMIT ${pageSize} OFFSET ${start}` : type === "post" && screen === "home" ? " LIMIT 4" : ""}`
    );
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows, total_posts: rows.length, seed });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };
}
