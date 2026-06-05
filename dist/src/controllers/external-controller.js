"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalController = void 0;
const env_1 = require("../config/env");
const legacy_request_1 = require("../lib/legacy-request");
const legacy_response_1 = require("../lib/legacy-response");
const user_repository_1 = require("../repositories/user-repository");
const social_repository_1 = require("../repositories/social-repository");
const wowza_service_1 = require("../services/wowza-service");
class ExternalController {
    userRepository;
    socialRepository;
    wowzaService;
    stripeService;
    constructor(dependencies) {
        this.userRepository = new user_repository_1.UserRepository(dependencies.prismaClient);
        this.socialRepository = new social_repository_1.SocialRepository(dependencies.prismaClient);
        this.wowzaService = new wowza_service_1.WowzaService();
        this.stripeService = dependencies.stripeService;
    }
    stripeConnect = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyOptionalString)(request, "user_id");
        if (!userId) {
            response.send("<br/><br/><br/><br/><br/><br/><br/><br/>User not found!");
            return;
        }
        const user = await this.userRepository.findByUserId(userId);
        if (!user) {
            response.send("<br/><br/><br/><br/><br/><br/><br/><br/>User not found!");
            return;
        }
        let stripeAccountId = String(user.stripe_account_id ?? "");
        if (stripeAccountId.length === 0) {
            const createAccount = await this.stripeService.createStandardAccount(String(user.user_email ?? ""));
            if (createAccount.status !== "1" || !createAccount.accountId) {
                response.type("html").send(createAccount.message);
                return;
            }
            stripeAccountId = createAccount.accountId;
            await this.userRepository.updateStripeAccountId(Number(userId), stripeAccountId);
        }
        const onboardingLink = await this.stripeService.createStandardOnboardingLink(request, stripeAccountId, userId);
        if (onboardingLink.status !== "1" || !onboardingLink.url) {
            response.type("html").send(onboardingLink.message);
            return;
        }
        response.redirect(onboardingLink.url);
    };
    stripeRedirect = async (request, response) => {
        const code = (0, legacy_request_1.getLegacyOptionalString)(request, "code");
        const state = (0, legacy_request_1.getLegacyOptionalString)(request, "state");
        if (code && state) {
            const authorize = await this.stripeService.authorizeCode(code);
            if (authorize.status === "1" && authorize.stripeAccountId) {
                const decodedState = Buffer.from(state, "base64").toString("utf8");
                const userId = decodedState.split("_")[0];
                if (userId) {
                    await this.userRepository.updateStripeAccountId(Number(userId), authorize.stripeAccountId);
                    await this.userRepository.updateUserType(Number(userId), 2);
                }
            }
        }
        response.redirect(env_1.env.STRIPE_RETURN_TO_APP_URL);
    };
    stripeRefresh = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyOptionalString)(request, "user_id");
        if (userId) {
            response.redirect(`/categories/stripe_connect.php?user_id=${userId}`);
            return;
        }
        response.status(200).send("");
    };
    stripeSuccess = async (request, response) => {
        const userId = (0, legacy_request_1.getLegacyOptionalString)(request, "user_id");
        let stripeActive = false;
        if (userId) {
            const user = await this.userRepository.findByUserId(userId);
            const stripeAccountId = String(user?.stripe_account_id ?? "");
            if (stripeAccountId.length > 0) {
                stripeActive = await this.stripeService.isAccountActive(stripeAccountId);
                if (stripeActive) {
                    await this.userRepository.updateUserType(Number(userId), 2);
                }
            }
        }
        response.type("html").send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Stripe Sample Connect Onboarding for Standard accounts</title>
    <meta name="description" content="Stripe Sample Connect Onboarding for Standard accounts" />
    <script>
      function isStripeActive() { return ${stripeActive ? 1 : 0}; }
    </script>
  </head>
  <body>
    <div class="sr-root">
      <div class="sr-main">
        <div class="sr-payment-summary payment-view">
          <h1 class="order-amount">The user returned to the app</h1>
        </div>
      </div>
    </div>
  </body>
</html>`);
    };
    addStripeCard = async (request, response) => {
        const stripeCustomerId = (0, legacy_request_1.getLegacyString)(request, "stripe_customer_id");
        const token = (0, legacy_request_1.getLegacyString)(request, "token");
        if (stripeCustomerId.length <= 0 || token.length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Data required to process request" });
            return;
        }
        const cardDetails = await this.stripeService.addCard(token, stripeCustomerId);
        if (String(cardDetails.status) === "1") {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Card added successfully", data: cardDetails.data });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, cardDetails);
    };
    listStripeCard = async (request, response) => {
        const cardDetails = await this.stripeService.listCards((0, legacy_request_1.getLegacyString)(request, "stripe_customer_id"));
        if (String(cardDetails.status) === "1") {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Card added successfully", data: cardDetails.data });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Something was wrong" });
    };
    deleteStripeCard = async (request, response) => {
        const cardDetails = await this.stripeService.deleteCard((0, legacy_request_1.getLegacyString)(request, "stripe_customer_id"), (0, legacy_request_1.getLegacyString)(request, "card_id"));
        if (String(cardDetails.status) === "1") {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Card added successfully", data: cardDetails.data });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, cardDetails);
    };
    startStream = async (request, response) => {
        const streamId = (0, legacy_request_1.getLegacyOptionalString)(request, "stream_id");
        if (!streamId) {
            response.json({ success: 0, message: "Required field(s) is missing" });
            return;
        }
        try {
            const payload = await this.wowzaService.startSandboxStream(streamId);
            response.send(payload);
        }
        catch (error) {
            response.send(`Error:${error instanceof Error ? error.message : "Unknown error"}`);
        }
    };
    streamState = async (request, response) => {
        const streamId = (0, legacy_request_1.getLegacyOptionalString)(request, "stream_id");
        if (!streamId) {
            response.json({ success: 0, message: "Required field(s) is missing" });
            return;
        }
        try {
            const payload = await this.wowzaService.getStreamState(streamId);
            response.send(payload);
        }
        catch (error) {
            response.send(`Error:${error instanceof Error ? error.message : "Unknown error"}`);
        }
    };
    getStreams = async (_request, response) => {
        try {
            const payload = await this.wowzaService.listSandboxStreams();
            response.send(payload);
        }
        catch (error) {
            response.send(`Error:${error instanceof Error ? error.message : "Unknown error"}`);
        }
    };
    addLivePost = async (request, response) => {
        const streamname = (0, legacy_request_1.getLegacyString)(request, "streamname");
        const streamtitle = (0, legacy_request_1.getLegacyString)(request, "streamtitle");
        const streamcost = (0, legacy_request_1.getLegacyString)(request, "streamcost");
        const userId = (0, legacy_request_1.getLegacyString)(request, "user_id");
        const liveThumb = (0, legacy_request_1.getLegacyOptionalString)(request, "live_thumb");
        let thumbUrl = "";
        if (liveThumb) {
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.png`;
            const fs = await Promise.resolve().then(() => __importStar(require("node:fs/promises")));
            const path = await Promise.resolve().then(() => __importStar(require("node:path")));
            const { env } = await Promise.resolve().then(() => __importStar(require("../config/env")));
            const buffer = Buffer.from(liveThumb, "base64");
            await fs.mkdir(env.legacyThumbnailsRoot, { recursive: true });
            await fs.writeFile(path.join(env.legacyThumbnailsRoot, fileName), buffer);
            const protocol = request.secure ? "https" : "http";
            const host = request.headers.host ?? "localhost:3000";
            thumbUrl = `${protocol}://${host}/categories/thumbnails/${fileName}`;
        }
        try {
            const row = await this.socialRepository.createLivePost({
                liveBy: userId,
                streamName: streamname,
                thumbUrl,
                title: streamtitle,
                cost: streamcost
            });
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Live Created Successfully", data: row });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    getLiveFeed = async (request, response) => {
        const data = await this.socialRepository.getLiveFeed((0, legacy_request_1.getLegacyString)(request, "user_id"), (0, legacy_request_1.getLegacyString)(request, "screen"));
        if (data.length === 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "No comments found for this b_id" });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Live Found successfully", data });
    };
    deleteLive = async (request, response) => {
        try {
            await this.socialRepository.deleteLive((0, legacy_request_1.getLegacyString)(request, "live_id"));
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Live Deleted Successfully", data: null });
        }
        catch {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
        }
    };
    checkWowza = async (_request, response) => {
        await this.socialRepository.expireInactiveLives();
        response.status(200).send("");
    };
    createWowzaStream = async (_request, response) => {
        response.status(200).send("");
    };
}
exports.ExternalController = ExternalController;
