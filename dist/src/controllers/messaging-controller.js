"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingController = void 0;
/**
 * Purpose: Recreate the legacy direct-message create and thread retrieval endpoints without redesigning response payloads.
 * Expected request body: message_sender, message_receiver, message_type, message_content, dual_id, message_url, thumb_url, image, video, video_thumb, user_id, friend_id, start, and page_size.
 * Expected query parameters: Legacy clients may also send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers and multipart content types for image or video messages.
 * Expected response structure: Legacy JSON payloads with status, data, userD, total_messages, post_id, message_url, and thumb_url keys.
 */
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const legacy_request_1 = require("../lib/legacy-request");
const legacy_response_1 = require("../lib/legacy-response");
const random_1 = require("../lib/random");
const env_1 = require("../config/env");
const messaging_repository_1 = require("../repositories/messaging-repository");
const notification_service_1 = require("../services/notification-service");
class MessagingController {
    messagingRepository;
    notificationService;
    constructor(dependencies) {
        this.messagingRepository = new messaging_repository_1.MessagingRepository(dependencies.prismaClient);
        this.notificationService = new notification_service_1.NotificationService(dependencies.prismaClient);
    }
    sendMessage = async (request, response) => {
        const messageType = Number((0, legacy_request_1.getLegacyString)(request, "message_type", "0"));
        const messageSender = (0, legacy_request_1.getLegacyString)(request, "message_sender");
        const messageReceiver = (0, legacy_request_1.getLegacyString)(request, "message_receiver");
        let messageContent = (0, legacy_request_1.getLegacyString)(request, "message_content");
        if (messageType === 1 || messageType === 3) {
            messageContent = "Image";
        }
        else if (messageType === 2 || messageType === 4) {
            messageContent = "Video";
        }
        let messageUrl = "";
        let thumbUrl = "";
        let dualId = "";
        try {
            if (messageType === 1) {
                const imageFile = this.getUploadedFile(request, "image");
                if (imageFile) {
                    const fileName = `${(0, random_1.legacyRandomString)(10)}.jpg`;
                    const filePath = node_path_1.default.join(env_1.env.legacyThumbnailsRoot, fileName);
                    await promises_1.default.mkdir(env_1.env.legacyThumbnailsRoot, { recursive: true });
                    await promises_1.default.writeFile(filePath, imageFile.buffer);
                    messageUrl = this.publicUrl(request, "thumbnails", fileName);
                }
            }
            else if (messageType === 2) {
                const thumbFile = this.getUploadedFile(request, "video_thumb");
                if (thumbFile) {
                    const thumbName = `${(0, random_1.legacyRandomString)(10)}.jpg`;
                    await promises_1.default.mkdir(env_1.env.legacyThumbnailsRoot, { recursive: true });
                    await promises_1.default.writeFile(node_path_1.default.join(env_1.env.legacyThumbnailsRoot, thumbName), thumbFile.buffer);
                    thumbUrl = this.publicUrl(request, "thumbnails", thumbName);
                }
                const videoFile = this.getUploadedFile(request, "video");
                if (videoFile) {
                    const ext = node_path_1.default.extname(videoFile.originalname) || ".mov";
                    const videoName = `${(0, random_1.legacyRandomString)(10)}${ext}`;
                    await promises_1.default.mkdir(env_1.env.legacyVideoPostsRoot, { recursive: true });
                    await promises_1.default.writeFile(node_path_1.default.join(env_1.env.legacyVideoPostsRoot, videoName), videoFile.buffer);
                    messageUrl = this.publicUrl(request, "videoPosts", videoName);
                }
            }
            else if (messageType === 3 || messageType === 4) {
                dualId = (0, legacy_request_1.getLegacyString)(request, "dual_id");
                messageUrl = (0, legacy_request_1.getLegacyString)(request, "message_url");
                thumbUrl = (0, legacy_request_1.getLegacyString)(request, "thumb_url");
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
            (0, legacy_response_1.sendLegacyJson)(response, {
                status: "1",
                message: "Message Sent Successfully",
                post_id: messageId,
                message_url: messageUrl,
                thumb_url: thumbUrl
            });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    getMessages = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
        const friendId = (0, legacy_request_1.getLegacyString)(request, "friend_id");
        const userD = await this.messagingRepository.getUserSummary(friendId);
        const rows = await this.messagingRepository.getConversation(userId, friendId);
        if (rows.length === 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "No threads found", userD: userD ?? null });
            return;
        }
        const data = [];
        for (const row of rows) {
            const oppositeId = String(row.message_sender) === userId ? String(row.message_receiver) : String(row.message_sender);
            const userDetails = await this.messagingRepository.getUserSummary(oppositeId);
            data.push({
                MessageThread: row,
                UserDetails: userDetails ?? {}
            });
        }
        if (data.length > 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", data, userD: userD ?? null });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "No threads found", userD: userD ?? null });
    };
    getThread = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
        const start = (0, legacy_request_1.getLegacyOptionalString)(request, "start");
        const pageSize = (0, legacy_request_1.getLegacyOptionalString)(request, "page_size");
        const rows = start !== undefined && pageSize !== undefined
            ? await this.messagingRepository.getThreadPaginated(userId, start, pageSize)
            : await this.messagingRepository.getThreadLegacy(userId);
        await this.respondWithThreadShape(response, userId, rows, true);
    };
    getThread20032020 = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
        const rows = await this.messagingRepository.getThreadLegacy(userId);
        await this.respondWithThreadShape(response, userId, rows, true, true);
    };
    getThread2 = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
        const start = (0, legacy_request_1.getLegacyOptionalString)(request, "start");
        const pageSize = (0, legacy_request_1.getLegacyOptionalString)(request, "page_size");
        const rows = await this.messagingRepository.getThread2(userId, start, pageSize);
        if (rows.length === 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "No threads found" });
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
        const payload = { status: "1", data };
        if (start !== undefined && pageSize !== undefined) {
            payload.total_messages = await this.messagingRepository.countDistinctThread2Users(userId);
        }
        (0, legacy_response_1.sendLegacyJson)(response, payload);
    };
    getThread215112022 = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
        const start = (0, legacy_request_1.getLegacyOptionalString)(request, "start");
        const pageSize = (0, legacy_request_1.getLegacyOptionalString)(request, "page_size");
        const rows = await this.messagingRepository.getThread215112022(userId, start, pageSize);
        if (rows.length === 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "No threads found" });
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
        const payload = { status: "1", data };
        if (start !== undefined && pageSize !== undefined) {
            payload.total_messages = await this.messagingRepository.countThreadRows(userId);
        }
        (0, legacy_response_1.sendLegacyJson)(response, payload);
    };
    async respondWithThreadShape(response, userId, rows, includeOpposite, useFullUser = false) {
        if (rows.length === 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "No threads found" });
            return;
        }
        const data = [];
        for (const row of rows) {
            const oppositeId = String(row.message_sender) === userId ? String(row.message_receiver) : String(row.message_sender);
            const userDetails = useFullUser
                ? await this.messagingRepository.getUserFull(oppositeId)
                : await this.messagingRepository.getUserSummary(oppositeId);
            if (userDetails) {
                const payload = {
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
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "No threads found" });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", data });
    }
    getUploadedFile(request, fieldName) {
        return request.files?.find((file) => file.fieldname === fieldName);
    }
    publicUrl(request, directory, fileName) {
        const protocol = request.secure ? "https" : "http";
        const host = request.headers.host ?? "localhost:3000";
        return `${protocol}://${host}/categories/${directory}/${fileName}`;
    }
}
exports.MessagingController = MessagingController;
