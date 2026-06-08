/**
 * Purpose: Recreate legacy profile detail and profile update endpoints while preserving payloads.
 * Expected request body: user_id, is_count, user_name, location, user_bio, user_state, hide_audience, and profile_pic.
 * Expected query parameters: Legacy clients may send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status, message, and detailed user data.
 */
import { Request, Response } from "express";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { sendLegacyJson } from "../lib/legacy-response";
import { legacyRandomString } from "../lib/random";
import { legacyStorageDiskPath, legacyStoragePublicUrl, writeBase64File } from "../lib/storage";
import { escapeSql } from "../lib/legacy-sql";
import { LegacyBaseController, LegacyControllerDependencies } from "./base-controller";

export class LegacyProfileController extends LegacyBaseController {
  public constructor(dependencies: LegacyControllerDependencies) {
    super(dependencies);
  }

  public getUserDetail = async (request: Request, response: Response): Promise<void> => {
    await this.respondWithUserDetail(request, response, false);
  };

  public getUserDetail5Jan2024 = async (request: Request, response: Response): Promise<void> => {
    await this.respondWithUserDetail(request, response, true);
  };

  public updateProfile = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getLegacyString(request, "user_id");
      const username = getLegacyOptionalString(request, "user_name");
      const location = getLegacyOptionalString(request, "location");
      const userBio = getLegacyOptionalString(request, "user_bio");
      const userState = getLegacyOptionalString(request, "user_state");
      const hideAudience = getLegacyOptionalString(request, "hide_audience");
      let picPath = "";

      if (username) {
        const existing = await this.profileRepository.findUserByUsername(username);
        if (existing && String(existing.user_id ?? "") !== userId) {
          sendLegacyJson(response, { status: "3", message: "This username is already taken." });
          return;
        }
      }

      if (getLegacyOptionalString(request, "profile_pic")) {
        const encoded = getLegacyString(request, "profile_pic");
        const fileName = `${legacyRandomString(10)}.jpg`;
        await writeBase64File(legacyStorageDiskPath("profile", fileName), encoded);
        picPath = legacyStoragePublicUrl(request, "profile", fileName);
      }

      const updateParts: string[] = [];
      if (username) updateParts.push(`user_name='${escapeSql(username.trim())}'`);
      if (location) updateParts.push(`user_location='${escapeSql(location)}'`);
      if (userBio) updateParts.push(`user_bio='${escapeSql(userBio)}'`);
      if (userState) updateParts.push(`user_state='${escapeSql(userState)}'`);
      if (hideAudience !== undefined) updateParts.push(`hide_audience='${escapeSql(hideAudience)}'`);
      if (picPath.length > 0) updateParts.push(`user_pic='${escapeSql(picPath)}'`);

      await this.profileRepository.updateUserProfile(userId, updateParts);
      if (picPath.length > 0) {
        await this.profileRepository.syncDualProfilePictures(userId, picPath);
      }

      const row = await this.profileRepository.profileBase(userId, false);
      if (!row) {
        sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
        return;
      }

      row.categories = await this.profileRepository.categories();
      row.interests = await this.profileRepository.interests();
      row.businesses = await this.profileRepository.businesses();
      row.user_categories = await this.profileRepository.userCategoryIds(userId);
      row.user_interests = await this.profileRepository.userInterestIds(userId);
      row.user_businesses = await this.profileRepository.userBusinessIds(userId);

      sendLegacyJson(response, { status: "1", message: "User Updated Successfully", data: row });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public updateProfileViewCountRoute = async (_request: Request, response: Response): Promise<void> => {
    response.status(200).send("");
  };

  private async respondWithUserDetail(request: Request, response: Response, includeLoginStats: boolean): Promise<void> {
    const userId = getLegacyString(request, "user_id");
    const isCount = Number(getLegacyOptionalString(request, "is_count") ?? 0);
    const result = await this.profileRepository.updateProfileViewCount(userId, isCount);
    if (result === false) {
      sendLegacyJson(response, { status: "0", message: "User not found" });
      return;
    }

    const previousViews = Number(isCount === 1 ? Number(result.user_views ?? 0) - 1 : Number(result.user_views ?? 0));
    const milestone = await this.profileRepository.shouldSendViewMilestone(previousViews);
    if (milestone) {
      await this.profileRepository.createViewMilestoneNotification(userId, milestone);
    }

    const payload = await this.profileRepository.profileBase(userId, includeLoginStats);
    if (!payload) {
      sendLegacyJson(response, { status: "0", message: "User not found" });
      return;
    }

    sendLegacyJson(response, { status: "1", message: "User details found successfully", data: payload });
  }
}
