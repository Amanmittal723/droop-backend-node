/**
 * Purpose: Recreate the legacy direct-message create and thread retrieval endpoints without redesigning response payloads.
 * Expected request body: message_sender, message_receiver, message_type, message_content, dual_id, message_url, thumb_url, image, video, video_thumb, user_id, friend_id, start, and page_size.
 * Expected query parameters: Legacy clients may also send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers and multipart content types for image or video messages.
 * Expected response structure: Legacy JSON payloads with status, data, userD, total_messages, post_id, message_url, and thumb_url keys.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { sendLegacyJson } from "../lib/legacy-response";
import { legacyRandomString } from "../lib/random";
import { env } from "../config/env";
import { MessagingRepository } from "../repositories/messaging-repository";
import { NotificationService } from "../services/notification-service";

type MessagingControllerDependencies = {
  prismaClient: PrismaClient;
};

export class MessagingController {
  private readonly messagingRepository: MessagingRepository;

  private readonly notificationService: NotificationService;

  public constructor(dependencies: MessagingControllerDependencies) {
    this.messagingRepository = new MessagingRepository(dependencies.prismaClient);
    this.notificationService = new NotificationService(dependencies.prismaClient);
  }

  public sendMessage = async (request: Request, response: Response): Promise<void> => {
    const messageType = Number(getLegacyString(request, "message_type", "0"));
    const messageSender = getLegacyString(request, "message_sender");
    const messageReceiver = getLegacyString(request, "message_receiver");
    let messageContent = getLegacyString(request, "message_content");

    if (messageType === 1 || messageType === 3) {
      messageContent = "Image";
    } else if (messageType === 2 || messageType === 4) {
      messageContent = "Video";
    }

    let messageUrl = "";
    let thumbUrl = "";
    let dualId = "";

    try {
      if (messageType === 1) {
        const imageFile = this.getUploadedFile(request, "image");
        if (imageFile) {
          const fileName = `${legacyRandomString(10)}.jpg`;
          const filePath = path.join(env.legacyThumbnailsRoot, fileName);
          await fs.mkdir(env.legacyThumbnailsRoot, { recursive: true });
          await fs.writeFile(filePath, imageFile.buffer);
          messageUrl = this.publicUrl(request, "thumbnails", fileName);
        }
      } else if (messageType === 2) {
        const thumbFile = this.getUploadedFile(request, "video_thumb");
        if (thumbFile) {
          const thumbName = `${legacyRandomString(10)}.jpg`;
          await fs.mkdir(env.legacyThumbnailsRoot, { recursive: true });
          await fs.writeFile(path.join(env.legacyThumbnailsRoot, thumbName), thumbFile.buffer);
          thumbUrl = this.publicUrl(request, "thumbnails", thumbName);
        }

        const videoFile = this.getUploadedFile(request, "video");
        if (videoFile) {
          const ext = path.extname(videoFile.originalname) || ".mov";
          const videoName = `${legacyRandomString(10)}${ext}`;
          await fs.mkdir(env.legacyVideoPostsRoot, { recursive: true });
          await fs.writeFile(path.join(env.legacyVideoPostsRoot, videoName), videoFile.buffer);
          messageUrl = this.publicUrl(request, "videoPosts", videoName);
        }
      } else if (messageType === 3 || messageType === 4) {
        dualId = getLegacyString(request, "dual_id");
        messageUrl = getLegacyString(request, "message_url");
        thumbUrl = getLegacyString(request, "thumb_url");
      }

      const dateTime = new Date().toISOString().slice(0, 19).replace("T", " ");
      const messageId = await this.messagingRepository.createMessage({
        sender: messageSender,
        receiver: messageReceiver,
        messageType,
        messageUrl,
        thumbUrl,
        dualId,
        content: messageContent,
        dateTime
      });

      await this.messagingRepository.replaceThread(messageSender, messageReceiver, messageContent, dateTime);

      const sender = await this.messagingRepository.getUserFull(messageSender);
      const userName = String(sender?.user_name ?? "");
      await this.notificationService.createNotification({
        text: `${userName}: ${messageContent}`,
        sentTo: messageReceiver,
        dual: "NO",
        sharedBy: messageSender,
        dateTime
      });

      sendLegacyJson(response, {
        status: "1",
        message: "Message Sent Successfully",
        post_id: messageId,
        message_url: messageUrl,
        thumb_url: thumbUrl
      });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public getMessages = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const friendId = getLegacyString(request, "friend_id");
    const userD = await this.messagingRepository.getUserSummary(friendId);
    const rows = await this.messagingRepository.getConversation(userId, friendId);

    if (rows.length === 0) {
      sendLegacyJson(response, { status: "0", message: "No threads found", userD: userD ?? null });
      return;
    }

    const data: Array<Record<string, unknown>> = [];
    for (const row of rows) {
      const oppositeId = String(row.message_sender) === userId ? String(row.message_receiver) : String(row.message_sender);
      const userDetails = await this.messagingRepository.getUserSummary(oppositeId);
      data.push({
        MessageThread: row,
        UserDetails: userDetails ?? {}
      });
    }

    if (data.length > 0) {
      sendLegacyJson(response, { status: "1", data, userD: userD ?? null });
      return;
    }

    sendLegacyJson(response, { status: "0", message: "No threads found", userD: userD ?? null });
  };

  public getThread = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const rows = start !== undefined && pageSize !== undefined
      ? await this.messagingRepository.getThreadPaginated(userId, start, pageSize)
      : await this.messagingRepository.getThreadLegacy(userId);

    await this.respondWithThreadShape(response, userId, rows, true);
  };

  public getThread20032020 = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const rows = await this.messagingRepository.getThreadLegacy(userId);
    await this.respondWithThreadShape(response, userId, rows, true, true);
  };

  public getThread2 = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const rows = await this.messagingRepository.getThread2(userId, start, pageSize);
    if (rows.length === 0) {
      sendLegacyJson(response, { status: "0", message: "No threads found" });
      return;
    }

    const data = rows.map((row) => {
      const userDetails = {
        user_id: row.user_id,
        user_pic: row.user_pic,
        user_full_name: row.user_full_name,
        user_name: row.user_name
      };
      const thread = { ...row };
      delete thread.user_id;
      delete thread.user_pic;
      delete thread.user_full_name;
      delete thread.user_name;
      return { MessageThread: thread, UserDetails: userDetails };
    });

    const payload: Record<string, unknown> = { status: "1", data };
    if (start !== undefined && pageSize !== undefined) {
      payload.total_messages = await this.messagingRepository.countDistinctThread2Users(userId);
    }
    sendLegacyJson(response, payload);
  };

  public getThread215112022 = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyString(request, "user_id");
    const start = getLegacyOptionalString(request, "start");
    const pageSize = getLegacyOptionalString(request, "page_size");
    const rows = await this.messagingRepository.getThread215112022(userId, start, pageSize);
    if (rows.length === 0) {
      sendLegacyJson(response, { status: "0", message: "No threads found" });
      return;
    }

    const data = rows.map((row) => {
      const userDetails = {
        user_id: row.user_id,
        user_pic: row.user_pic,
        user_full_name: row.user_full_name,
        user_name: row.user_name
      };
      const thread = { ...row };
      delete thread.user_id;
      delete thread.user_pic;
      delete thread.user_full_name;
      delete thread.user_name;
      return { MessageThread: thread, UserDetails: userDetails };
    });

    const payload: Record<string, unknown> = { status: "1", data };
    if (start !== undefined && pageSize !== undefined) {
      payload.total_messages = await this.messagingRepository.countThreadRows(userId);
    }
    sendLegacyJson(response, payload);
  };

  private async respondWithThreadShape(
    response: Response,
    userId: string,
    rows: Record<string, unknown>[],
    includeOpposite: boolean,
    useFullUser = false
  ): Promise<void> {
    if (rows.length === 0) {
      sendLegacyJson(response, { status: "0", message: "No threads found" });
      return;
    }

    const data: Array<Record<string, unknown>> = [];
    for (const row of rows) {
      const oppositeId = String(row.message_sender) === userId ? String(row.message_receiver) : String(row.message_sender);
      const userDetails = useFullUser
        ? await this.messagingRepository.getUserFull(oppositeId)
        : await this.messagingRepository.getUserSummary(oppositeId);
      if (userDetails) {
        const payload: Record<string, unknown> = {
          MessageThread: row,
          UserDetails: userDetails
        };
        if (includeOpposite) {
          payload.Opposite = userDetails;
        }
        data.push(payload);
      }
    }

    if (data.length === 0) {
      sendLegacyJson(response, { status: "0", message: "No threads found" });
      return;
    }
    sendLegacyJson(response, { status: "1", data });
  }

  private getUploadedFile(request: Request, fieldName: string): Express.Multer.File | undefined {
    return (request.files as Express.Multer.File[] | undefined)?.find((file) => file.fieldname === fieldName);
  }

  private publicUrl(request: Request, directory: string, fileName: string): string {
    const protocol = request.secure ? "https" : "http";
    const host = request.headers.host ?? "localhost:2000";
    return `${protocol}://${host}/categories/${directory}/${fileName}`;
  }
}
