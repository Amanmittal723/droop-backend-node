/**
 * Purpose: Recreate legacy dual and video post endpoints while preserving uploads, SQL writes, and payloads.
 * Expected request body: Legacy dual/video fields, base64 images, multipart files, and tagging/collab metadata.
 * Expected query parameters: Legacy clients may send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers and multipart headers for uploaded media.
 * Expected response structure: Legacy JSON payloads with status, message, and optional inserted data.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { Request, Response } from "express";
import { env } from "../config/env";
import { legacyNowString } from "../lib/legacy-datetime";
import { buildLegacyRouteAssetUrl, deleteAssetIfPresent, getUploadedFile, saveBase64Buffer, saveUploadedBuffer } from "../lib/legacy-media";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { sendLegacyJson } from "../lib/legacy-response";
import { legacyRandomString } from "../lib/random";
import { legacyStorageDiskPath, legacyStoragePublicUrl } from "../lib/storage";
import { csvToList, escapeSql, numericList } from "../lib/legacy-sql";
import { LegacyRow } from "../lib/legacy-row";
import { LegacyBaseController, LegacyControllerDependencies } from "./base-controller";

export class LegacyMediaController extends LegacyBaseController {
  public constructor(dependencies: LegacyControllerDependencies) {
    super(dependencies);
  }

  public rejectDual = async (request: Request, response: Response): Promise<void> => {
    try {
      const dualId = getLegacyString(request, "dual_id");
      const dualCaption = getLegacyString(request, "dual_caption");
      const dualPostedBy = getLegacyString(request, "dual_posted_by");
      const dualUserName = getLegacyString(request, "dual_user_name");
      const dualUpdatedBy = getLegacyString(request, "dual_updated_by");
      const dualDate = getLegacyString(request, "dual_date");
      const dualTime = getLegacyString(request, "dual_time");
      const dateTime = legacyNowString();

      await this.mediaRepository.updateDual(
        dualId,
        `dual_caption='${escapeSql(dualCaption)}', dual_date='${escapeSql(dualDate)}', dual_time='${escapeSql(dualTime)}', date_time='${dateTime}', receiver_user_status = 2`
      );
      await this.sharedRepository.insertNotification(`${dualUserName} Rejected your dual request`, dualPostedBy, "YES", dualUpdatedBy, dualId);
      sendLegacyJson(response, { status: "1", message: "Dual Updated Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
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
      const thumbnail = getUploadedFile(request, "video_thumb");
      const video = getUploadedFile(request, "video");

      if (!video) {
        sendLegacyJson(response, { status: "0", message: "Error while adding record in database File not found." });
        return;
      }

      let thumbUrl = "";
      if (thumbnail) {
        const thumbFileName = `${legacyRandomString(10)}.jpg`;
        await saveUploadedBuffer(env.legacyThumbnailsRoot, thumbFileName, thumbnail.buffer);
        thumbUrl = buildLegacyRouteAssetUrl(request, "thumbnails", thumbFileName);
      }

      const videoExt = path.extname(video.originalname) || ".mov";
      const videoFileName = `${legacyRandomString(10)}${videoExt}`;
      await saveUploadedBuffer(env.legacyVideoPostsRoot, videoFileName, video.buffer);
      const videoUrl = buildLegacyRouteAssetUrl(request, "videoPosts", videoFileName);

      const inserted = await this.mediaRepository.createVideoDual({
        userId,
        thumbUrl,
        title,
        userName,
        userPic,
        videoUrl,
        cost,
        dateTime: legacyNowString(),
        linkedTo,
        linkedName,
        linkedPic,
        dualDate,
        dualTime,
        receiverNotes,
        receiverUserStatus,
        cardId,
        collabPrice,
        taggedUserIds
      });

      if (!inserted) {
        sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
        return;
      }

      const dualId = String(inserted.dual_id);
      await this.mediaRepository.addDualCategories(dualId, categoryIds);
      await this.mediaRepository.addDualInterests(dualId, interestIds);

      if (linkedName !== "NA") {
        await this.sharedRepository.insertNotification(`${userName} wants to cross-brand with you 🤝.`, linkedTo, "YES", userId, dualId);
      } else if (taggedUserIds.length > 0) {
        for (const taggedId of csvToList(taggedUserIds)) {
          await this.sharedRepository.insertNotification(`${userName} just tagged you`, taggedId, "YES", userId, dualId);
        }
      }

      sendLegacyJson(response, { status: "1", message: "Video Created Successfully", data: inserted });
    } catch (error) {
      sendLegacyJson(response, {
        status: "0",
        message: `Error while adding record in database ${error instanceof Error ? error.message : ""}`.trim()
      });
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
      const fileName = `${legacyRandomString(12)}.jpg`;
      await saveBase64Buffer(legacyStorageDiskPath("dualPosts"), fileName, profilePic);
      const picPath = legacyStoragePublicUrl(request, "dualPosts", fileName);

      const row = await this.mediaRepository.createImageDual({
        picPath,
        userId,
        linkedTo,
        linkedName,
        linkedPic,
        title,
        userName,
        userPic,
        dualDate,
        dualTime,
        dateTime: legacyNowString(),
        receiverNotes,
        receiverUserStatus,
        cardId,
        collabPrice,
        taggedUserIds
      });
      if (!row) {
        sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
        return;
      }

      const dualId = String(row.dual_id);
      await this.mediaRepository.addDualCategories(dualId, categoryIds);
      await this.mediaRepository.addDualInterests(dualId, interestIds);
      if (linkedName !== "NA") {
        await this.sharedRepository.insertNotification(`${userName} wants to post together`, linkedTo, "YES", userId, dualId);
      } else if (taggedUserIds.length > 0) {
        for (const taggedId of csvToList(taggedUserIds)) {
          await this.sharedRepository.insertNotification(`${userName} just tagged you`, taggedId, "YES", userId, dualId);
        }
      }

      sendLegacyJson(response, { status: "1", message: "Dual Posted Successfully" });
    } catch (error) {
      sendLegacyJson(response, {
        status: "0",
        message: `Error while adding record in database${error instanceof Error ? error.message : ""}`
      });
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
      const row = await this.mediaRepository.findDualById(dualId);
      if (!row) {
        sendLegacyJson(response, { status: "0", message: "Dual not found" });
        return;
      }

      const userDetails = await this.sharedRepository.queryOne<LegacyRow>(
        `SELECT * FROM user_master WHERE user_id='${escapeSql(String(row.dual_linked_to ?? ""))}'`
      );
      const loginUserDetails = await this.sharedRepository.queryOne<LegacyRow>(
        `SELECT * FROM user_master WHERE user_id='${escapeSql(String(row.dual_posted_by ?? ""))}'`
      );

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

      await this.mediaRepository.updateDual(
        dualId,
        `dual_caption='${escapeSql(dualCaption)}', dual_date='${escapeSql(dualDate)}', dual_time='${escapeSql(dualTime)}', date_time='${legacyNowString()}', receiver_user_status = 1 ${queryUpdate}`
      );
      await this.sharedRepository.insertNotification(`${dualUserName} just wrote a caption to your photo 👍.`, dualPostedBy, "YES", dualUpdatedBy, dualId);
      if (loginUserDetails) {
        const tagged = String(row.tagged_users ?? "");
        if (tagged.length > 0) {
          for (const taggedId of csvToList(tagged)) {
            await this.sharedRepository.insertNotification(`${String(row.dual_posted_name ?? "")} just tagged you`, taggedId, "YES", dualPostedBy, dualId);
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
      await this.mediaRepository.updateDual(
        dualId,
        `dual_caption='${escapeSql(dualCaption)}', dual_date='${escapeSql(dualDate)}', dual_time='${escapeSql(dualTime)}', date_time='${legacyNowString()}'`
      );
      await this.sharedRepository.insertNotification(`${dualUserName} just wrote a caption to your photo 👍.`, dualPostedBy, "YES", dualUpdatedBy, dualId);
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

      const row = await this.mediaRepository.findDualDeleteInfo(dualId);
      if (row) {
        if (Number(row.dual_type ?? 0) === 2) {
          await deleteAssetIfPresent(env.legacyThumbnailsRoot, String(row.dual_image ?? ""));
          await deleteAssetIfPresent(env.legacyVideoPostsRoot, String(row.video_url ?? ""));
        } else {
          await deleteAssetIfPresent(legacyStorageDiskPath("dualPosts"), String(row.dual_image ?? ""));
        }
      }

      await this.mediaRepository.deleteDualRelations(dualId);
      sendLegacyJson(response, { status: "1", message: "Dual Deleted Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };
}
