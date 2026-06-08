/**
 * Purpose: Recreate legacy destructive maintenance endpoints while preserving payloads.
 * Expected request body: user_id and related legacy identifiers.
 * Expected query parameters: Legacy clients may send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status, message, and optional data.
 */
import { Request, Response } from "express";
import { getLegacyString } from "../../lib/legacy-request";
import { sendLegacyJson } from "../../lib/legacy-response";
import { escapeSql } from "../../lib/legacy-sql";
import { LegacyBaseController, LegacyControllerDependencies } from "./base-controller";

export class LegacyMaintenanceController extends LegacyBaseController {
  public constructor(dependencies: LegacyControllerDependencies) {
    super(dependencies);
  }

  public delUser = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getLegacyString(request, "user_id");
      await this.sharedRepository.execute(`DELETE FROM user_master WHERE user_id='${escapeSql(userId)}'`);
      await this.sharedRepository.execute(`DELETE FROM comments_master WHERE comment_by='${escapeSql(userId)}'`);
      await this.sharedRepository.execute(`DELETE FROM dualpost_master WHERE dual_posted_by='${escapeSql(userId)}'`);
      await this.sharedRepository.execute(`DELETE FROM notifications_master WHERE notification_sent_to='${escapeSql(userId)}'`);
      await this.sharedRepository.execute(`DELETE FROM followers_master WHERE followed_by='${escapeSql(userId)}'`);
      await this.sharedRepository.execute(`DELETE FROM venture_master WHERE venture_posted_by='${escapeSql(userId)}'`);
      sendLegacyJson(response, { status: "1", message: "User Deleted Successfully", data: null });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };
}
