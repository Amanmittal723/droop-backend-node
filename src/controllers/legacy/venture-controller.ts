/**
 * Purpose: Recreate legacy venture create, upload, and listing endpoints while preserving payloads.
 * Expected request body: user_id, venture_title, venture_url, venture_thumb, and venture_video.
 * Expected query parameters: Legacy clients may send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status, message, data, or url.
 */
import { Request, Response } from "express";
import { getLegacyOptionalString, getLegacyString } from "../../lib/legacy-request";
import { sendLegacyJson } from "../../lib/legacy-response";
import { legacyRandomString } from "../../lib/random";
import { legacyStorageDiskPath, legacyStoragePublicUrl, writeBase64File } from "../../lib/storage";
import { LegacyBaseController, LegacyControllerDependencies } from "./base-controller";

export class LegacyVentureController extends LegacyBaseController {
  public constructor(dependencies: LegacyControllerDependencies) {
    super(dependencies);
  }

  public postVenture = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getLegacyString(request, "user_id");
      const ventureTitle = getLegacyString(request, "venture_title");
      const ventureUrl = getLegacyString(request, "venture_url");
      const thumbBase64 = getLegacyString(request, "venture_thumb");
      const fileName = `${legacyRandomString(12)}.jpg`;
      await writeBase64File(legacyStorageDiskPath("venture", fileName), thumbBase64);
      const picPath = legacyStoragePublicUrl(request, "venture", fileName);
      await this.ventureRepository.createVenture(ventureUrl, userId, picPath, ventureTitle);
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
      const fileName = `${legacyRandomString(12)}.mp4`;
      await writeBase64File(legacyStorageDiskPath("venture", fileName), ventureVideo);
      sendLegacyJson(response, { status: "1", url: legacyStoragePublicUrl(request, "venture", fileName) });
    } catch {
      sendLegacyJson(response, { status: "0", message: "ErrorVideo upload" });
    }
  };

  public getVentures = async (request: Request, response: Response): Promise<void> => {
    const rows = await this.ventureRepository.getVentures(getLegacyString(request, "user_id"));
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Venture Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No comments found for this b_id" });
  };

  public getVentureDet = async (request: Request, response: Response): Promise<void> => {
    const rows = await this.ventureRepository.getVentureDetail(getLegacyString(request, "venture_id"));
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Venture Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No comments found for this b_id" });
  };

  public getUserVenture = async (request: Request, response: Response): Promise<void> => {
    const rows = await this.ventureRepository.getUserVentures(getLegacyString(request, "user_id"));
    if (rows.length > 0) {
      sendLegacyJson(response, { status: "1", message: "Venture Found successfully", data: rows });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "No comments found for this b_id" });
  };
}
