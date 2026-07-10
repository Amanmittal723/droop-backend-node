/**
 * Purpose: Recreate lightweight Stripe redirect endpoints and simple Wowza stream utility endpoints.
 * Expected request body: user_id, code, state, or stream_id depending on the endpoint.
 * Expected query parameters: The same legacy keys may be provided via query string.
 * Expected headers: Host headers are used when building redirects or callback URLs.
 * Expected response structure: Legacy HTML, redirect responses, or raw Wowza API payloads matching PHP behavior.
 */
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { sendLegacyJson } from "../lib/legacy-response";
import { UserRepository } from "../repositories/user-repository";
import { SocialRepository } from "../repositories/social-repository";
import { WowzaService } from "../services/wowza-service";
import { StripeService } from "../services/stripe-service";

type ExternalControllerDependencies = {
  prismaClient: PrismaClient;
  stripeService: StripeService;
};

export class ExternalController {
  private readonly userRepository: UserRepository;

  private readonly socialRepository: SocialRepository;

  private readonly wowzaService: WowzaService;

  private readonly stripeService: StripeService;

  public constructor(dependencies: ExternalControllerDependencies) {
    this.userRepository = new UserRepository(dependencies.prismaClient);
    this.socialRepository = new SocialRepository(dependencies.prismaClient);
    this.wowzaService = new WowzaService();
    this.stripeService = dependencies.stripeService;
  }

  public stripeConnect = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyOptionalString(request, "user_id");
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

  public stripeRedirect = async (request: Request, response: Response): Promise<void> => {
    const code = getLegacyOptionalString(request, "code");
    const state = getLegacyOptionalString(request, "state");

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

    response.redirect(env.STRIPE_RETURN_TO_APP_URL);
  };

  public stripeRefresh = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyOptionalString(request, "user_id");
    if (userId) {
      response.redirect(`/categories/stripe_connect?user_id=${userId}`);
      return;
    }
    response.status(200).send("");
  };

  public stripeSuccess = async (request: Request, response: Response): Promise<void> => {
    const userId = getLegacyOptionalString(request, "user_id");
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

  public addStripeCard = async (request: Request, response: Response): Promise<void> => {
    const stripeCustomerId = getLegacyString(request, "stripe_customer_id");
    const token = getLegacyString(request, "token");
    if (stripeCustomerId.length <= 0 || token.length <= 0) {
      sendLegacyJson(response, { status: "0", message: "Data required to process request" });
      return;
    }

    const cardDetails = await this.stripeService.addCard(token, stripeCustomerId);
    if (String(cardDetails.status) === "1") {
      sendLegacyJson(response, { status: "1", message: "Card added successfully", data: cardDetails.data });
      return;
    }
    sendLegacyJson(response, cardDetails);
  };

  public listStripeCard = async (request: Request, response: Response): Promise<void> => {
    const cardDetails = await this.stripeService.listCards(getLegacyString(request, "stripe_customer_id"));
    if (String(cardDetails.status) === "1") {
      sendLegacyJson(response, { status: "1", message: "Card added successfully", data: cardDetails.data });
      return;
    }
    sendLegacyJson(response, { status: "0", message: "Something was wrong" });
  };

  public deleteStripeCard = async (request: Request, response: Response): Promise<void> => {
    const cardDetails = await this.stripeService.deleteCard(
      getLegacyString(request, "stripe_customer_id"),
      getLegacyString(request, "card_id")
    );
    if (String(cardDetails.status) === "1") {
      sendLegacyJson(response, { status: "1", message: "Card added successfully", data: cardDetails.data });
      return;
    }
    sendLegacyJson(response, cardDetails);
  };

  public startStream = async (request: Request, response: Response): Promise<void> => {
    const streamId = getLegacyOptionalString(request, "stream_id");
    if (!streamId) {
      response.json({ success: 0, message: "Required field(s) is missing" });
      return;
    }
    try {
      const payload = await this.wowzaService.startSandboxStream(streamId);
      response.send(payload);
    } catch (error) {
      response.send(`Error:${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  public streamState = async (request: Request, response: Response): Promise<void> => {
    const streamId = getLegacyOptionalString(request, "stream_id");
    if (!streamId) {
      response.json({ success: 0, message: "Required field(s) is missing" });
      return;
    }
    try {
      const payload = await this.wowzaService.getStreamState(streamId);
      response.send(payload);
    } catch (error) {
      response.send(`Error:${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  public getStreams = async (_request: Request, response: Response): Promise<void> => {
    try {
      const payload = await this.wowzaService.listSandboxStreams();
      response.send(payload);
    } catch (error) {
      response.send(`Error:${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  public addLivePost = async (request: Request, response: Response): Promise<void> => {
    const streamname = getLegacyString(request, "streamname");
    const streamtitle = getLegacyString(request, "streamtitle");
    const streamcost = getLegacyString(request, "streamcost");
    const userId = getLegacyString(request, "user_id");
    const liveThumb = getLegacyOptionalString(request, "live_thumb");
    let thumbUrl = "";

    if (liveThumb) {
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.png`;
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const { env } = await import("../config/env");
      const buffer = Buffer.from(liveThumb, "base64");
      await fs.mkdir(env.legacyThumbnailsRoot, { recursive: true });
      await fs.writeFile(path.join(env.legacyThumbnailsRoot, fileName), buffer);
      const protocol = request.secure ? "https" : "http";
      const host = request.headers.host ?? "localhost:2000";
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
      sendLegacyJson(response, { status: "1", message: "Live Created Successfully", data: row });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public getLiveFeed = async (request: Request, response: Response): Promise<void> => {
    const data = await this.socialRepository.getLiveFeed(getLegacyString(request, "user_id"), getLegacyString(request, "screen"));
    if (data.length === 0) {
      sendLegacyJson(response, { status: "0", message: "No comments found for this b_id" });
      return;
    }
    sendLegacyJson(response, { status: "1", message: "Live Found successfully", data });
  };

  public deleteLive = async (request: Request, response: Response): Promise<void> => {
    try {
      await this.socialRepository.deleteLive(getLegacyString(request, "live_id"));
      sendLegacyJson(response, { status: "1", message: "Live Deleted Successfully", data: null });
    } catch {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
    }
  };

  public checkWowza = async (_request: Request, response: Response): Promise<void> => {
    await this.socialRepository.expireInactiveLives();
    response.status(200).send("");
  };

  public createWowzaStream = async (_request: Request, response: Response): Promise<void> => {
    response.status(200).send("");
  };
}
