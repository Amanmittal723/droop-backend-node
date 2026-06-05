"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialController = void 0;
const legacy_request_1 = require("../lib/legacy-request");
const legacy_response_1 = require("../lib/legacy-response");
const notification_service_1 = require("../services/notification-service");
const social_repository_1 = require("../repositories/social-repository");
class SocialController {
    socialRepository;
    notificationService;
    constructor(dependencies) {
        this.socialRepository = new social_repository_1.SocialRepository(dependencies.prismaClient);
        this.notificationService = new notification_service_1.NotificationService(dependencies.prismaClient);
    }
    checkBlocking = async (request, response) => {
        const exists = await this.socialRepository.hasBlock((0, legacy_request_1.getLegacyString)(request, "user_id"), (0, legacy_request_1.getLegacyString)(request, "block_id"));
        (0, legacy_response_1.sendLegacyJson)(response, exists
            ? { status: "1", message: "Check blocking successfully" }
            : { status: "0", message: "User not found" });
    };
    checkFollowing = async (request, response) => {
        const exists = await this.socialRepository.hasFollow((0, legacy_request_1.getLegacyString)(request, "followed_by"), (0, legacy_request_1.getLegacyString)(request, "following_id"));
        (0, legacy_response_1.sendLegacyJson)(response, exists
            ? { status: "1", message: "Logged in successfully" }
            : { status: "0", message: "User not found" });
    };
    checkMute = async (request, response) => {
        const exists = await this.socialRepository.hasMute((0, legacy_request_1.getLegacyString)(request, "user_id"), (0, legacy_request_1.getLegacyString)(request, "mute_id"));
        (0, legacy_response_1.sendLegacyJson)(response, exists
            ? { status: "1", message: "Check mute successfully" }
            : { status: "0", message: "User not found" });
    };
    blockUser = async (request, response) => {
        try {
            const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
            const blockId = (0, legacy_request_1.getLegacyString)(request, "block_id");
            const isDelete = (0, legacy_request_1.getLegacyString)(request, "isDelete");
            if (isDelete === "YES") {
                await this.socialRepository.removeBlock(userId, blockId);
            }
            else {
                await this.socialRepository.addBlock(userId, blockId);
            }
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Block Successfully" });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    muteUser = async (request, response) => {
        try {
            const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
            const muteId = (0, legacy_request_1.getLegacyString)(request, "mute_id");
            const isDelete = (0, legacy_request_1.getLegacyString)(request, "isDelete");
            if (isDelete === "YES") {
                await this.socialRepository.removeMute(userId, muteId);
            }
            else {
                await this.socialRepository.addMute(userId, muteId);
            }
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Mute Successfully" });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    followUser = async (request, response) => {
        const followedBy = (0, legacy_request_1.getLegacyString)(request, "followed_by");
        const followingId = (0, legacy_request_1.getLegacyString)(request, "following_id");
        const userName = (0, legacy_request_1.getLegacyString)(request, "user_name");
        const isDelete = (0, legacy_request_1.getLegacyString)(request, "isDelete");
        if (followedBy.trim().length === 0 || followingId.trim().length === 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Invalid Request" });
            return;
        }
        try {
            if (isDelete === "YES") {
                await this.socialRepository.removeFollow(followedBy, followingId);
            }
            else {
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
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Followed Successfully" });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    saveDual = async (request, response) => {
        try {
            const savedBy = (0, legacy_request_1.getLegacyString)(request, "saved_by");
            const dualId = (0, legacy_request_1.getLegacyString)(request, "dual_id");
            const isDelete = (0, legacy_request_1.getLegacyString)(request, "isDelete");
            if (isDelete === "YES") {
                await this.socialRepository.removeSave(savedBy, dualId);
            }
            else if (!(await this.socialRepository.hasSave(savedBy, dualId))) {
                await this.socialRepository.addSave(savedBy, dualId, new Date().toISOString().slice(0, 19).replace("T", " "));
            }
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Saved Successfully" });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    loveDual = async (request, response) => {
        try {
            const lovedBy = (0, legacy_request_1.getLegacyString)(request, "loved_by");
            const dualId = (0, legacy_request_1.getLegacyString)(request, "dual_id");
            const isDelete = (0, legacy_request_1.getLegacyString)(request, "isDelete");
            const userName = (0, legacy_request_1.getLegacyString)(request, "user_name");
            if (isDelete === "YES") {
                await this.socialRepository.removeLove(lovedBy, dualId);
                (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Loved Successfully" });
                return;
            }
            if (await this.socialRepository.hasLove(lovedBy, dualId)) {
                (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Already loved!" });
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
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Loved Successfully" });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    wantDual = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyOptionalString)(request, "user_id");
        const dualId = (0, legacy_request_1.getLegacyOptionalString)(request, "dual_id");
        const userName = (0, legacy_request_1.getLegacyOptionalString)(request, "user_name");
        if (!userId || !dualId || !userName) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Data required to process request" });
            return;
        }
        const dual = await this.socialRepository.getDualSummary(dualId);
        if (!dual) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "No Dual found" });
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
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Want Dual Success" });
    };
    shareDual = async (request, response) => {
        try {
            const dualId = (0, legacy_request_1.getLegacyString)(request, "dual_id");
            const sharedBy = (0, legacy_request_1.getLegacyString)(request, "shared_by");
            const shareWith = (0, legacy_request_1.getLegacyString)(request, "share_with");
            const messageContent = (0, legacy_request_1.getLegacyString)(request, "message_content");
            const dateTime = new Date().toISOString().slice(0, 19).replace("T", " ");
            await this.notificationService.createNotification({
                text: messageContent,
                sentTo: shareWith,
                dual: "YES",
                dualId,
                sharedBy,
                dateTime
            });
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Shared  Successfully" });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    shareVenture = async (request, response) => {
        try {
            const sharedBy = (0, legacy_request_1.getLegacyString)(request, "shared_by");
            const shareWith = (0, legacy_request_1.getLegacyString)(request, "share_with");
            const messageContent = (0, legacy_request_1.getLegacyString)(request, "message_content");
            const dateTime = new Date().toISOString().slice(0, 19).replace("T", " ");
            await this.notificationService.createNotification({
                text: messageContent,
                sentTo: shareWith,
                dual: "YES",
                sharedBy,
                dateTime
            });
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Shared  Successfully" });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    askingSetPriceNotification = async (request, response) => {
        await this.notificationService.createNotification({
            text: `${(0, legacy_request_1.getLegacyString)(request, "user_name")} wants to know you’re promo price`,
            sentTo: (0, legacy_request_1.getLegacyString)(request, "to_user_id"),
            dual: "NO",
            sharedBy: (0, legacy_request_1.getLegacyString)(request, "from_user_id"),
            notificationType: 2,
            dateTime: new Date().toISOString().slice(0, 19).replace("T", " ")
        });
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Ask you to set price successfully" });
    };
    getNotifications = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
        const startRaw = (0, legacy_request_1.getLegacyOptionalString)(request, "start");
        const pageSizeRaw = (0, legacy_request_1.getLegacyOptionalString)(request, "page_size");
        const paginated = startRaw !== undefined && pageSizeRaw !== undefined;
        const data = await this.socialRepository.listNotifications(userId, paginated ? Number(startRaw) : undefined, paginated ? Number(pageSizeRaw) : undefined);
        if (data.length === 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "No Duals found for this b_id" });
            return;
        }
        const payload = {
            status: "1",
            message: "Notifications Found successfully",
            data
        };
        if (paginated) {
            payload.total_notifications = await this.socialRepository.countNotifications(userId);
        }
        (0, legacy_response_1.sendLegacyJson)(response, payload);
    };
    markNotification = async (request, response) => {
        try {
            await this.socialRepository.markNotificationsRead((0, legacy_request_1.getLegacyString)(request, "user_id"));
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Notification marked read Successfully" });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    deleteNotifications = async (request, response) => {
        try {
            const notificationId = (0, legacy_request_1.getLegacyOptionalString)(request, "notification_id");
            if (notificationId) {
                await this.socialRepository.deleteNotificationById(notificationId);
            }
            else {
                await this.socialRepository.deleteNotificationsByUserId((0, legacy_request_1.getLegacyString)(request, "user_id"));
            }
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Notifications Deleted Successfully" });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    markRead = async (request, response) => {
        try {
            await this.socialRepository.markMessageThreadRead((0, legacy_request_1.getLegacyString)(request, "user_id"), (0, legacy_request_1.getLegacyString)(request, "sender_id"));
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Message marked read Successfully" });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    clearChat = async (request, response) => {
        try {
            await this.socialRepository.clearChat((0, legacy_request_1.getLegacyString)(request, "user_id"), (0, legacy_request_1.getLegacyString)(request, "friend_id"));
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Chat Cleared Successfully" });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    changePassword = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyOptionalString)(request, "user_id");
        const oldPassword = (0, legacy_request_1.getLegacyOptionalString)(request, "old_password");
        const newPassword = (0, legacy_request_1.getLegacyOptionalString)(request, "new_password");
        if (!userId) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "User id required" });
            return;
        }
        if (!oldPassword) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Old password required" });
            return;
        }
        if (!newPassword) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "New password required" });
            return;
        }
        const currentPassword = await this.socialRepository.getUserPassword(userId);
        if (currentPassword === null) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "User not found" });
            return;
        }
        if (currentPassword !== oldPassword) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Old password does not match. Please try again." });
            return;
        }
        try {
            await this.socialRepository.updateUserPassword(userId, newPassword);
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Password changed successfully" });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Unable to change password. Please try again." });
        }
    };
}
exports.SocialController = SocialController;
