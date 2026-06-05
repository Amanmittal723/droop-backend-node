/**
 * Purpose: Recreate legacy block, follow, mute, save, love, notification, and lightweight message maintenance endpoints.
 * Expected request body: Legacy ids and flags such as user_id, block_id, followed_by, dual_id, isDelete, start, and page_size.
 * Expected query parameters: Legacy clients may send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy JSON payloads with exact status and message values from the PHP scripts.
 */
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { sendLegacyJson } from "../lib/legacy-response";
import { NotificationService } from "../services/notification-service";
import { SocialRepository } from "../repositories/social-repository";

type SocialControllerDependencies = {
  prismaClient: PrismaClient;
};

export class SocialController {
  private readonly socialRepository: SocialRepository;

  private readonly notificationService: NotificationService;

  public constructor(dependencies: SocialControllerDependencies) {
    this.socialRepository = new SocialRepository(dependencies.prismaClient);
    this.notificationService = new NotificationService(dependencies.prismaClient);
  }

  public checkBlocking = async (request: Request, response: Response): Promise<void> => {
    const exists = await this.socialRepository.hasBlock(getLegacyString(request, "user_id"), getLegacyString(request, "block_id"));
    sendLegacyJson(response, exists
      ? { status: "1", message: "Check blocking successfully" }
      : { status: "0", message: "User not found" });
  };

  public checkFollowing = async (request: Request, response: Response): Promise<void> => {
    const exists = await this.socialRepository.hasFollow(getLegacyString(request, "followed_by"), getLegacyString(request, "following_id"));
    sendLegacyJson(response, exists
      ? { status: "1", message: "Logged in successfully" }
      : { status: "0", message: "User not found" });
  };

  public checkMute = async (request: Request, response: Response): Promise<void> => {
    const exists = await this.socialRepository.hasMute(getLegacyString(request, "user_id"), getLegacyString(request, "mute_id"));
    sendLegacyJson(response, exists
      ? { status: "1", message: "Check mute successfully" }
      : { status: "0", message: "User not found" });
  };

  public blockUser = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getLegacyString(request, "user_id");
      const blockId = getLegacyString(request, "block_id");
      const isDelete = getLegacyString(request, "isDelete");
      if (isDelete === "YES") {
        await this.socialRepository.removeBlock(userId, blockId);
      } else {
        await this.socialRepository.addBlock(userId, blockId);
      }
      sendLegacyJson(response, { status: "1", message: "Block Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public muteUser = async (request: Request, response: Response): Promise<void> => {
    try {
      const userId = getLegacyString(request, "user_id");
      const muteId = getLegacyString(request, "mute_id");
      const isDelete = getLegacyString(request, "isDelete");
      if (isDelete === "YES") {
        await this.socialRepository.removeMute(userId, muteId);
      } else {
        await this.socialRepository.addMute(userId, muteId);
      }
      sendLegacyJson(response, { status: "1", message: "Mute Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public followUser = async (request: Request, response: Response): Promise<void> => {
    const followedBy = getLegacyString(request, "followed_by");
    const followingId = getLegacyString(request, "following_id");
    const userName = getLegacyString(request, "user_name");
    const isDelete = getLegacyString(request, "isDelete");

    if (followedBy.trim().length === 0 || followingId.trim().length === 0) {
      sendLegacyJson(response, { status: "0", message: "Invalid Request" });
      return;
    }

    try {
      if (isDelete === "YES") {
        await this.socialRepository.removeFollow(followedBy, followingId);
      } else {
        await this.socialRepository.addFollow(followedBy, followingId);
        const dateTime = new Date().toISOString().slice(0, 19).replace("T", " ");
        await this.notificationService.createNotification({
          text: `${userName} followed you`,
          sentTo: followingId,
          dual: "NO",
          sharedBy: followedBy,
          dateTime
        });
      }
      sendLegacyJson(response, { status: "1", message: "Followed Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public saveDual = async (request: Request, response: Response): Promise<void> => {
    try {
      const savedBy = getLegacyString(request, "saved_by");
      const dualId = getLegacyString(request, "dual_id");
      const isDelete = getLegacyString(request, "isDelete");
      if (isDelete === "YES") {
        await this.socialRepository.removeSave(savedBy, dualId);
      } else if (!(await this.socialRepository.hasSave(savedBy, dualId))) {
        await this.socialRepository.addSave(savedBy, dualId, new Date().toISOString().slice(0, 19).replace("T", " "));
      }
      sendLegacyJson(response, { status: "1", message: "Saved Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public loveDual = async (request: Request, response: Response): Promise<void> => {
    try {
      const lovedBy = getLegacyString(request, "loved_by");
      const dualId = getLegacyString(request, "dual_id");
      const isDelete = getLegacyString(request, "isDelete");
      const userName = getLegacyString(request, "user_name");

      if (isDelete === "YES") {
        await this.socialRepository.removeLove(lovedBy, dualId);
        sendLegacyJson(response, { status: "1", message: "Loved Successfully" });
        return;
      }

      if (await this.socialRepository.hasLove(lovedBy, dualId)) {
        sendLegacyJson(response, { status: "0", message: "Already loved!" });
        return;
      }

      await this.socialRepository.addLove(lovedBy, dualId, new Date().toISOString().slice(0, 19).replace("T", " "));
      const dual = await this.socialRepository.getDualSummary(dualId);
      if (dual) {
        const dateTime = new Date().toISOString().slice(0, 19).replace("T", " ");
        const linkedTo = Number(dual.dual_linked_to ?? -1);
        const ownerText = linkedTo === -1 ? `${userName} liked your post` : `${userName} liked your friend post`;
        await this.notificationService.createNotification({
          text: ownerText,
          sentTo: String(dual.dual_posted_by ?? ""),
          dual: "YES",
          dualId,
          sharedBy: lovedBy,
          dateTime
        });
        if (linkedTo > 0) {
          await this.notificationService.createNotification({
            text: `${userName} liked your friend post`,
            sentTo: String(linkedTo),
            dual: "YES",
            dualId,
            sharedBy: lovedBy,
            dateTime
          });
        }
      }
      sendLegacyJson(response, { status: "1", message: "Loved Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public wantDual = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyOptionalString(request, "user_id");
    const dualId = getLegacyOptionalString(request, "dual_id");
    const userName = getLegacyOptionalString(request, "user_name");
    if (!userId || !dualId || !userName) {
      sendLegacyJson(response, { status: "0", message: "Data required to process request" });
      return;
    }

    const dual = await this.socialRepository.getDualSummary(dualId);
    if (!dual) {
      sendLegacyJson(response, { status: "0", message: "No Dual found" });
      return;
    }

    await this.notificationService.createNotification({
      text: `${userName} wants to buy your product.`,
      sentTo: String(dual.dual_posted_by ?? ""),
      dual: "YES",
      dualId,
      sharedBy: userId,
      notificationType: 1,
      dateTime: new Date().toISOString().slice(0, 19).replace("T", " ")
    });

    sendLegacyJson(response, { status: "1", message: "Want Dual Success" });
  };

  public shareDual = async (request: Request, response: Response): Promise<void> => {
    try {
      const dualId = getLegacyString(request, "dual_id");
      const sharedBy = getLegacyString(request, "shared_by");
      const shareWith = getLegacyString(request, "share_with");
      const messageContent = getLegacyString(request, "message_content");
      const dateTime = new Date().toISOString().slice(0, 19).replace("T", " ");
      await this.notificationService.createNotification({
        text: messageContent,
        sentTo: shareWith,
        dual: "YES",
        dualId,
        sharedBy,
        dateTime
      });
      sendLegacyJson(response, { status: "1", message: "Shared  Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public shareVenture = async (request: Request, response: Response): Promise<void> => {
    try {
      const sharedBy = getLegacyString(request, "shared_by");
      const shareWith = getLegacyString(request, "share_with");
      const messageContent = getLegacyString(request, "message_content");
      const dateTime = new Date().toISOString().slice(0, 19).replace("T", " ");
      await this.notificationService.createNotification({
        text: messageContent,
        sentTo: shareWith,
        dual: "YES",
        sharedBy,
        dateTime
      });
      sendLegacyJson(response, { status: "1", message: "Shared  Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public askingSetPriceNotification = async (request: Request, response: Response): Promise<void> => {
    await this.notificationService.createNotification({
      text: `${getLegacyString(request, "user_name")} wants to know you’re promo price`,
      sentTo: getLegacyString(request, "to_user_id"),
      dual: "NO",
      sharedBy: getLegacyString(request, "from_user_id"),
      notificationType: 2,
      dateTime: new Date().toISOString().slice(0, 19).replace("T", " ")
    });
    sendLegacyJson(response, { status: "1", message: "Ask you to set price successfully" });
  };

  public getNotifications = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const startRaw = getLegacyOptionalString(request, "start");
    const pageSizeRaw = getLegacyOptionalString(request, "page_size");
    const paginated = startRaw !== undefined && pageSizeRaw !== undefined;
    const data = await this.socialRepository.listNotifications(
      userId,
      paginated ? Number(startRaw) : undefined,
      paginated ? Number(pageSizeRaw) : undefined
    );
    if (data.length === 0) {
      sendLegacyJson(response, { status: "0", message: "No Duals found for this b_id" });
      return;
    }
    const payload: Record<string, unknown> = {
      status: "1",
      message: "Notifications Found successfully",
      data
    };
    if (paginated) {
      payload.total_notifications = await this.socialRepository.countNotifications(userId);
    }
    sendLegacyJson(response, payload);
  };

  public markNotification = async (request: Request, response: Response): Promise<void> => {
    try {
      await this.socialRepository.markNotificationsRead(getLegacyString(request, "user_id"));
      sendLegacyJson(response, { status: "1", message: "Notification marked read Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public deleteNotifications = async (request: Request, response: Response): Promise<void> => {
    try {
      const notificationId = getLegacyOptionalString(request, "notification_id");
      if (notificationId) {
        await this.socialRepository.deleteNotificationById(notificationId);
      } else {
        await this.socialRepository.deleteNotificationsByUserId(getLegacyString(request, "user_id"));
      }
      sendLegacyJson(response, { status: "1", message: "Notifications Deleted Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public markRead = async (request: Request, response: Response): Promise<void> => {
    try {
      await this.socialRepository.markMessageThreadRead(getLegacyString(request, "user_id"), getLegacyString(request, "sender_id"));
      sendLegacyJson(response, { status: "1", message: "Message marked read Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public clearChat = async (request: Request, response: Response): Promise<void> => {
    try {
      await this.socialRepository.clearChat(getLegacyString(request, "user_id"), getLegacyString(request, "friend_id"));
      sendLegacyJson(response, { status: "1", message: "Chat Cleared Successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public changePassword = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyOptionalString(request, "user_id");
    const oldPassword = getLegacyOptionalString(request, "old_password");
    const newPassword = getLegacyOptionalString(request, "new_password");

    if (!userId) {
      sendLegacyJson(response, { status: "0", message: "User id required" });
      return;
    }
    if (!oldPassword) {
      sendLegacyJson(response, { status: "0", message: "Old password required" });
      return;
    }
    if (!newPassword) {
      sendLegacyJson(response, { status: "0", message: "New password required" });
      return;
    }

    const currentPassword = await this.socialRepository.getUserPassword(userId);
    if (currentPassword === null) {
      sendLegacyJson(response, { status: "0", message: "User not found" });
      return;
    }
    if (currentPassword !== oldPassword) {
      sendLegacyJson(response, { status: "0", message: "Old password does not match. Please try again." });
      return;
    }

    try {
      await this.socialRepository.updateUserPassword(userId, newPassword);
      sendLegacyJson(response, { status: "1", message: "Password changed successfully" });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Unable to change password. Please try again." });
    }
  };
}
