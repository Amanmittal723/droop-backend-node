/**
 * Purpose: Recreate legacy search endpoints for ventures, users, lives, and dual posts.
 * Expected request body: search_txt, user_id, start, page_size, and seed.
 * Expected query parameters: Legacy clients may send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status, message, data, and optional seed.
 */
import { Request, Response } from "express";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { sendLegacyJson } from "../lib/legacy-response";
import { LegacyRow } from "../lib/legacy-row";
import { LegacyBaseController, LegacyControllerDependencies } from "./base-controller";

export class LegacySearchController extends LegacyBaseController {
  public constructor(dependencies: LegacyControllerDependencies) {
    super(dependencies);
  }

  public searchVenture = async (request: Request, response: Response): Promise<void> => {
    const rows = await this.searchRepository.searchVenture(getLegacyString(request, "search_txt"));
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Venture Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No comments found for this b_id" });
  };

  public searchLive = async (request: Request, response: Response): Promise<void> => {
    const rows = await this.searchRepository.searchLive(getLegacyString(request, "search_txt"));
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Live Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No comments found for this b_id" });
  };

  public searchDualPost = async (request: Request, response: Response): Promise<void> => {
    const rows = await this.searchRepository.searchDualPost(getLegacyString(request, "search_txt"));
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
  };

  public searchBusiness = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const blockedCsv = (await this.followRepository.blockedByUserIds(userId))
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry))
      .join(",");
    const rows = await this.searchRepository.searchBusiness(getLegacyString(request, "search_txt"), userId, blockedCsv);
    await this.appendBusinesses(rows);
    if (rows.length > 0) {
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
    const blockedCsv = (await this.followRepository.blockedByUserIds(userId))
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry))
      .join(",");
    const rows = await this.searchRepository.searchUserPrefix(searchTxt, userId, blockedCsv, pageSize, start);
    await this.appendBusinesses(rows);
    if (rows.length > 0) {
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
    const blockedCsv = (await this.followRepository.mutuallyBlockedIds(userId))
      .map((entry) => `'${entry.replace(/'/g, "''")}'`)
      .join(",");
    const rows = await this.searchRepository.searchUserPrefixOrRandom(searchTxt, userId, blockedCsv, pageSize, start);
    await this.appendBusinesses(rows);
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "User Found successfully", data: rows, seed });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No user found for the name" });
  };

  private async appendBusinesses(rows: LegacyRow[]): Promise<void> {
    for (const row of rows) {
      row.user_businesses = await this.profileRepository.userBusinesses(row.user_id as string | number);
    }
  }
}
