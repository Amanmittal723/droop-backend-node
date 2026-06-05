/**
 * Purpose: Recreate lightweight reporting, venture maintenance, viewer count, tagging, and price-setting endpoints.
 * Expected request body: Legacy ids and scalar values such as dual_id, live_id, venture_id, user_ids, views, and price fields.
 * Expected query parameters: Legacy clients may send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with status, message, and optional data values matching PHP.
 */
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { sendLegacyJson } from "../lib/legacy-response";
import { SocialRepository } from "../repositories/social-repository";
import { UserRepository } from "../repositories/user-repository";

type UtilityControllerDependencies = {
  prismaClient: PrismaClient;
};

export class UtilityController {
  private readonly socialRepository: SocialRepository;

  private readonly userRepository: UserRepository;

  public constructor(dependencies: UtilityControllerDependencies) {
    this.socialRepository = new SocialRepository(dependencies.prismaClient);
    this.userRepository = new UserRepository(dependencies.prismaClient);
  }

  private success(response: Response, message: string, data?: unknown): void {
    const payload: Record<string, unknown> = { status: "1", message };
    if (data !== undefined) {
      payload.data = data;
    }
    sendLegacyJson(response, payload);
  }

  private failure(response: Response, message = "Error while adding record in database"): void {
    sendLegacyJson(response, { status: "0", message });
  }

  public reportDual = async (request: Request, response: Response): Promise<void> => {
    try {
      await this.socialRepository.markDualReported(getLegacyString(request, "dual_id"));
      this.success(response, "Reported Successfully");
    } catch {
      this.failure(response);
    }
  };

  public reportLive = async (request: Request, response: Response): Promise<void> => {
    try {
      await this.socialRepository.markLiveReported(getLegacyString(request, "live_id"));
      this.success(response, "Reported Successfully");
    } catch {
      this.failure(response);
    }
  };

  public reportVenture = async (request: Request, response: Response): Promise<void> => {
    try {
      await this.socialRepository.markVentureReported(getLegacyString(request, "venture_id"));
      this.success(response, "Reported Successfully");
    } catch {
      this.failure(response);
    }
  };

  public deleteVenture = async (request: Request, response: Response): Promise<void> => {
    try {
      await this.socialRepository.deleteVenture(getLegacyString(request, "ventureid"));
      sendLegacyJson(response, { status: "1", message: "Venture Deleted Successfully" });
    } catch {
      this.failure(response);
    }
  };

  public updateVentureCount = async (request: Request, response: Response): Promise<void> => {
    try {
      await this.socialRepository.updateVentureViews(getLegacyString(request, "venture_id"), getLegacyString(request, "views"));
      this.success(response, "User Updated Successfully");
    } catch {
      this.failure(response);
    }
  };

  public addViewer = async (request: Request, response: Response): Promise<void> => {
    const liveId = getLegacyString(request, "live_id");
    const row = await this.socialRepository.getLiveStreamById(liveId);
    if (!row) {
      this.failure(response);
      return;
    }
    const nextValue = String(Number(row.viewersCount ?? 0) + 1);
    await this.socialRepository.updateLiveViewerCount(liveId, nextValue);
    this.success(response, "Count Updated Successfully");
  };

  public removeViewer = async (request: Request, response: Response): Promise<void> => {
    const liveId = getLegacyString(request, "live_id");
    const row = await this.socialRepository.getLiveStreamById(liveId);
    if (!row) {
      this.failure(response);
      return;
    }
    const nextValue = Math.max(0, Number(row.viewersCount ?? 0) - 1);
    await this.socialRepository.updateLiveViewerCount(liveId, String(nextValue));
    this.success(response, "Count Updated Successfully");
  };

  public getTaggedUserDetails = async (request: Request, response: Response): Promise<void> => {
    const userIds = getLegacyString(request, "user_ids");
    if (userIds.length <= 0) {
      sendLegacyJson(response, { status: "0", message: "Invalid Request" });
      return;
    }
    const data = await this.socialRepository.getTaggedUsers(userIds);
    if (data.length === 0) {
      sendLegacyJson(response, { status: "0", message: "User not found" });
      return;
    }
    sendLegacyJson(response, { status: "1", message: "User details found successfully", data });
  };

  public getDualDet = async (request: Request, response: Response): Promise<void> => {
    const dual = await this.socialRepository.getDualById(getLegacyString(request, "dual_id"));
    if (!dual) {
      sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
      return;
    }
    sendLegacyJson(response, { status: "1", message: "Dual Post Found successfully", data: dual });
  };

  public getDualPostViews = async (request: Request, response: Response): Promise<void> => {
    const data = await this.socialRepository.getDualViewUsers(getLegacyString(request, "dual_id"));
    if (data.length === 0) {
      sendLegacyJson(response, { status: "0", message: "Views not found" });
      return;
    }
    sendLegacyJson(response, { status: "1", message: "View count found successfully", data });
  };

  public viewDualPost = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const dualId = getLegacyString(request, "dual_id");
    const dual = await this.socialRepository.incrementDualView(dualId, userId);
    if (!dual) {
      sendLegacyJson(response, { status: "0", message: "Dual not found" });
      return;
    }
    const profileUpdate = await this.socialRepository.incrementUserProfileViews(String(dual.dual_posted_by ?? ""));
    if (profileUpdate === false) {
      sendLegacyJson(response, { status: "0", message: "User not found" });
      return;
    }
    sendLegacyJson(response, { status: "1", message: "View count updated successfully" });
  };

  public setPrice = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const user = await this.userRepository.findByUserId(userId);
    if (!user) {
      sendLegacyJson(response, { status: "0", message: "User not found" });
      return;
    }

    const isFreePromo = getLegacyString(request, "is_free_promo");
    const hasStripeAccount = String(user.stripe_account_id ?? "").length > 0;
    if (!(isFreePromo === "1" || hasStripeAccount)) {
      sendLegacyJson(response, {
        status: "0",
        message: "Stripe is not yet connected for your account. Please become an influencer from settings before setting price."
      });
      return;
    }

    await this.socialRepository.setUserPrices(
      userId,
      getLegacyString(request, "story_price"),
      getLegacyString(request, "image_price"),
      getLegacyString(request, "video_price"),
      isFreePromo
    );

    sendLegacyJson(response, {
      status: "1",
      message: "Set price successfully",
      data: {
        story_price: getLegacyString(request, "story_price"),
        image_price: getLegacyString(request, "image_price"),
        video_price: getLegacyString(request, "video_price"),
        is_free_promo: isFreePromo
      }
    });
  };
}
