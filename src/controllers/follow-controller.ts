/**
 * Purpose: Recreate legacy contacts, follow list, and suggestion endpoints without changing payloads.
 * Expected request body: user_id, emails, logged_user_id, start, page_size, random, and seed.
 * Expected query parameters: Legacy clients may send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status, message, data, total, seed, and random_start keys.
 */
import { Request, Response } from "express";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { sendLegacyJson } from "../lib/legacy-response";
import { LegacyRow } from "../lib/legacy-row";
import { escapeSql } from "../lib/legacy-sql";
import { LegacyBaseController, LegacyControllerDependencies } from "./base-controller";

export class LegacyFollowController extends LegacyBaseController {
  public constructor(dependencies: LegacyControllerDependencies) {
    super(dependencies);
  }

  public addContacts = async (request: Request, response: Response): Promise<void> => {
    try {
      const payload = typeof request.body === "object" && request.body ? request.body : {};
      const userId = String((payload as Record<string, unknown>).user_id ?? "");
      const rawEmails = (payload as Record<string, unknown>).emails;
      const emails = Array.isArray(rawEmails) ? (rawEmails as unknown[]).map((entry) => String(entry)) : [];
      await this.followRepository.upsertUserContacts(userId, emails);
      sendLegacyJson(response, { status: "1", message: "Success!" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error inserting data" });
    }
  };

  public getFollowing = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const loggedUserId = getLegacyOptionalString(request, "logged_user_id") ?? userId;
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const { following } = await this.profileRepository.buildFollowerList(userId, loggedUserId, true);

    let rows = following;
    if (start !== undefined && pageSize !== undefined) {
      rows = rows.slice(Number(start), Number(start) + Number(pageSize));
    }

    if (rows.length > 0) {
      sendLegacyJson(response, {
        status: "1",
        data: rows,
        total: await this.profileRepository.followingTotal(userId)
      });
      return;
    }

    sendLegacyJson(response, { status: "0", message: "No data found" });
  };

  public getFollowers = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const loggedUserId = getLegacyOptionalString(request, "logged_user_id") ?? userId;
    const { following, followers } = await this.profileRepository.buildFollowerList(userId, loggedUserId, false);

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
    const { followers } = await this.profileRepository.buildFollowerList(userId, loggedUserId, false);

    let rows = followers;
    if (start !== undefined && pageSize !== undefined) {
      rows = rows.slice(Number(start), Number(start) + Number(pageSize));
    }

    if (rows.length > 0) {
      sendLegacyJson(response, {
        status: "1",
        data: rows,
        total: await this.profileRepository.followerTotal(userId)
      });
      return;
    }

    sendLegacyJson(response, { status: "0", message: "No data found" });
  };

  // NEW (other-profile v2): mutual friends between the logged-in viewer and a target profile.
  // Mirrors getFollowers2's {status, data, total} envelope.
  public getMutualFriends = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id"); // target profile owner
    const loggedUserId = getLegacyString(request, "logged_user_id"); // viewer
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const rows = await this.followRepository.mutualFriends(loggedUserId, userId, start, pageSize);

    if (rows.length > 0) {
      sendLegacyJson(response, {
        status: "1",
        data: rows,
        total: await this.followRepository.mutualFriendsTotal(loggedUserId, userId)
      });
      return;
    }

    sendLegacyJson(response, { status: "0", message: "No data found" });
  };

  public getUserSuggession = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const start = getLegacyString(request, "start", "0");
    const pageSize = getLegacyString(request, "page_size", "100");
    const random = getLegacyString(request, "random", "0");
    const seed = getLegacyOptionalString(request, "seed") ?? String(Date.now());
    const followingIds = await this.followRepository.followingIds(userId);
    const followingCsv = followingIds.map((id) => `'${escapeSql(id)}'`).join(",");

    const withBusinesses = async (rows: LegacyRow[]): Promise<LegacyRow[]> => {
      for (const row of rows) {
        row.user_businesses = await this.profileRepository.userBusinesses(row.user_id as string | number);
      }
      return rows;
    };

    if (String(random) === "1") {
      const data = await withBusinesses(await this.followRepository.randomSuggestedUsers(userId, followingCsv, start, pageSize));
      if (data.length > 0) {
        sendLegacyJson(response, {
          status: "1",
          message: "User Found successfully",
          data,
          seed,
          random_start: Number(start) + Number(pageSize)
        });
        return;
      }
      sendLegacyJson(response, { status: "0", message: "No user found for the name" });
      return;
    }

    let rows = await withBusinesses(await this.followRepository.contactSuggestedUsers(userId, followingCsv, start, pageSize));
    if (rows.length < Number(pageSize)) {
      const randomRows = await withBusinesses(
        await this.followRepository.randomSuggestedUsers(userId, followingCsv, "0", String(Number(pageSize) - rows.length))
      );
      rows = rows.concat(randomRows);
    }

    if (rows.length > 0) {
      sendLegacyJson(response, {
        status: "1",
        message: "User Found successfully",
        data: rows,
        seed,
        random_start: rows.length
      });
      return;
    }

    sendLegacyJson(response, { status: "0", message: "No user found for the name" });
  };
}
