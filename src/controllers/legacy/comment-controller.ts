/**
 * Purpose: Recreate legacy live comment endpoints without changing payloads.
 * Expected request body: b_id, broadcast_id, comment_by, and comment_txt.
 * Expected query parameters: Legacy clients may send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status, message, data, and viewerCount.
 */
import { Request, Response } from "express";
import { getLegacyString } from "../../lib/legacy-request";
import { sendLegacyJson } from "../../lib/legacy-response";
import { legacyNowString } from "../../lib/legacy-datetime";
import { LegacyBaseController, LegacyControllerDependencies } from "./base-controller";

export class LegacyCommentController extends LegacyBaseController {
  public constructor(dependencies: LegacyControllerDependencies) {
    super(dependencies);
  }

  public getComments = async (request: Request, response: Response): Promise<void> => {
    const broadcastId = getLegacyString(request, "b_id");
    const checkTime = legacyNowString();
    await this.commentRepository.updateLiveLastChecked(broadcastId, checkTime);
    const live = await this.commentRepository.getLiveById(broadcastId);
    if (!live) {
      sendLegacyJson(response, { status: "2", message: "Live broadcast stopped by broadcaster." });
      return;
    }

    const rows = await this.commentRepository.getComments(broadcastId);
    if (rows.length > 0) {
      sendLegacyJson(response, {
        status: "1",
        message: "Comments Found successfully",
        data: rows,
        viewerCount: live.viewersCount
      });
      return;
    }

    sendLegacyJson(response, {
      status: "0",
      message: "No comments found for this b_id",
      viewerCount: live.viewersCount
    });
  };

  public postComment = async (request: Request, response: Response): Promise<void> => {
    try {
      await this.commentRepository.insertComment(
        getLegacyString(request, "broadcast_id"),
        getLegacyString(request, "comment_by"),
        getLegacyString(request, "comment_txt")
      );
      sendLegacyJson(response, { status: "1", message: "Comment Posted Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };
}
