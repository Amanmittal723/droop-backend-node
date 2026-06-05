"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtilityController = void 0;
const legacy_request_1 = require("../lib/legacy-request");
const legacy_response_1 = require("../lib/legacy-response");
const social_repository_1 = require("../repositories/social-repository");
const user_repository_1 = require("../repositories/user-repository");
class UtilityController {
    socialRepository;
    userRepository;
    constructor(dependencies) {
        this.socialRepository = new social_repository_1.SocialRepository(dependencies.prismaClient);
        this.userRepository = new user_repository_1.UserRepository(dependencies.prismaClient);
    }
    success(response, message, data) {
        const payload = { status: "1", message };
        if (data !== undefined) {
            payload.data = data;
        }
        (0, legacy_response_1.sendLegacyJson)(response, payload);
    }
    failure(response, message = "Error while adding record in database") {
        (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message });
    }
    reportDual = async (request, response) => {
        try {
            await this.socialRepository.markDualReported((0, legacy_request_1.getLegacyString)(request, "dual_id"));
            this.success(response, "Reported Successfully");
        }
        catch {
            this.failure(response);
        }
    };
    reportLive = async (request, response) => {
        try {
            await this.socialRepository.markLiveReported((0, legacy_request_1.getLegacyString)(request, "live_id"));
            this.success(response, "Reported Successfully");
        }
        catch {
            this.failure(response);
        }
    };
    reportVenture = async (request, response) => {
        try {
            await this.socialRepository.markVentureReported((0, legacy_request_1.getLegacyString)(request, "venture_id"));
            this.success(response, "Reported Successfully");
        }
        catch {
            this.failure(response);
        }
    };
    deleteVenture = async (request, response) => {
        try {
            await this.socialRepository.deleteVenture((0, legacy_request_1.getLegacyString)(request, "ventureid"));
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Venture Deleted Successfully" });
        }
        catch {
            this.failure(response);
        }
    };
    updateVentureCount = async (request, response) => {
        try {
            await this.socialRepository.updateVentureViews((0, legacy_request_1.getLegacyString)(request, "venture_id"), (0, legacy_request_1.getLegacyString)(request, "views"));
            this.success(response, "User Updated Successfully");
        }
        catch {
            this.failure(response);
        }
    };
    addViewer = async (request, response) => {
        const liveId = (0, legacy_request_1.getLegacyString)(request, "live_id");
        const row = await this.socialRepository.getLiveStreamById(liveId);
        if (!row) {
            this.failure(response);
            return;
        }
        const nextValue = String(Number(row.viewersCount ?? 0) + 1);
        await this.socialRepository.updateLiveViewerCount(liveId, nextValue);
        this.success(response, "Count Updated Successfully");
    };
    removeViewer = async (request, response) => {
        const liveId = (0, legacy_request_1.getLegacyString)(request, "live_id");
        const row = await this.socialRepository.getLiveStreamById(liveId);
        if (!row) {
            this.failure(response);
            return;
        }
        const nextValue = Math.max(0, Number(row.viewersCount ?? 0) - 1);
        await this.socialRepository.updateLiveViewerCount(liveId, String(nextValue));
        this.success(response, "Count Updated Successfully");
    };
    getTaggedUserDetails = async (request, response) => {
        const userIds = (0, legacy_request_1.getLegacyString)(request, "user_ids");
        if (userIds.length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Invalid Request" });
            return;
        }
        const data = await this.socialRepository.getTaggedUsers(userIds);
        if (data.length === 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "User not found" });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "User details found successfully", data });
    };
    getDualDet = async (request, response) => {
        const dual = await this.socialRepository.getDualById((0, legacy_request_1.getLegacyString)(request, "dual_id"));
        if (!dual) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "No Duals found for this b_id" });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Dual Post Found successfully", data: dual });
    };
    getDualPostViews = async (request, response) => {
        const data = await this.socialRepository.getDualViewUsers((0, legacy_request_1.getLegacyString)(request, "dual_id"));
        if (data.length === 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Views not found" });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "View count found successfully", data });
    };
    viewDualPost = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
        const dualId = (0, legacy_request_1.getLegacyString)(request, "dual_id");
        const dual = await this.socialRepository.incrementDualView(dualId, userId);
        if (!dual) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Dual not found" });
            return;
        }
        const profileUpdate = await this.socialRepository.incrementUserProfileViews(String(dual.dual_posted_by ?? ""));
        if (profileUpdate === false) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "User not found" });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "View count updated successfully" });
    };
    setPrice = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
        const user = await this.userRepository.findByUserId(userId);
        if (!user) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "User not found" });
            return;
        }
        const isFreePromo = (0, legacy_request_1.getLegacyString)(request, "is_free_promo");
        const hasStripeAccount = String(user.stripe_account_id ?? "").length > 0;
        if (!(isFreePromo === "1" || hasStripeAccount)) {
            (0, legacy_response_1.sendLegacyJson)(response, {
                status: "0",
                message: "Stripe is not yet connected for your account. Please become an influencer from settings before setting price."
            });
            return;
        }
        await this.socialRepository.setUserPrices(userId, (0, legacy_request_1.getLegacyString)(request, "story_price"), (0, legacy_request_1.getLegacyString)(request, "image_price"), (0, legacy_request_1.getLegacyString)(request, "video_price"), isFreePromo);
        (0, legacy_response_1.sendLegacyJson)(response, {
            status: "1",
            message: "Set price successfully",
            data: {
                story_price: (0, legacy_request_1.getLegacyString)(request, "story_price"),
                image_price: (0, legacy_request_1.getLegacyString)(request, "image_price"),
                video_price: (0, legacy_request_1.getLegacyString)(request, "video_price"),
                is_free_promo: isFreePromo
            }
        });
    };
}
exports.UtilityController = UtilityController;
