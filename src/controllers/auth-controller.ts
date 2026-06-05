/**
 * Purpose: Recreate the legacy PHP signup and login flows, including Facebook login behavior and Stripe side effects.
 * Expected request body: name, email, pass, username, device_token, device_type, profile_pic, user_type, password, fb_id, fb_email.
 * Expected query parameters: Legacy clients may also send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Host headers are used for generated storage URLs and Stripe connect URLs.
 * Expected response structure: Legacy JSON payloads with status, message, and optional data matching the PHP scripts.
 */
import path from "node:path";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getLegacyOptionalString, getLegacyString } from "../lib/legacy-request";
import { sendLegacyJson } from "../lib/legacy-response";
import { legacyRandomString } from "../lib/random";
import { legacyStorageDiskPath, legacyStoragePublicUrl, writeBase64File } from "../lib/storage";
import { MetadataRepository } from "../repositories/metadata-repository";
import { UserRepository } from "../repositories/user-repository";
import { ProfileComposerService } from "../services/profile-composer";
import { MailService } from "../services/mail-service";
import { StripeService } from "../services/stripe-service";
import { shouldUpdateDeviceToken, trimLegacyUsername } from "../validators/auth-validator";

type AuthControllerDependencies = {
  prismaClient: PrismaClient;
  stripeService: StripeService;
  mailService: MailService;
};

export class AuthController {
  private readonly metadataRepository: MetadataRepository;

  private readonly userRepository: UserRepository;

  private readonly profileComposer: ProfileComposerService;

  private readonly mailService: MailService;

  public constructor(private readonly dependencies: AuthControllerDependencies) {
    this.metadataRepository = new MetadataRepository(dependencies.prismaClient);
    this.userRepository = new UserRepository(dependencies.prismaClient);
    this.profileComposer = new ProfileComposerService(
      this.metadataRepository,
      this.userRepository,
      dependencies.stripeService
    );
    this.mailService = dependencies.mailService;
  }

  public signup = async (request: Request, response: Response): Promise<void> => {
    const name = getLegacyString(request, "name");
    const email = getLegacyString(request, "email");
    const password = getLegacyString(request, "pass");
    const username = trimLegacyUsername(getLegacyString(request, "username"));
    const deviceToken = getLegacyString(request, "device_token");
    const deviceType = getLegacyString(request, "device_type");
    const encodedProfilePicture = getLegacyString(request, "profile_pic");
    const userType = getLegacyString(request, "user_type", "1");

    if (username.length <= 0) {
      sendLegacyJson(response, { status: "2", message: "Username is required." });
      return;
    }

    const existingByEmail = await this.userRepository.findByEmail(email);
    if (existingByEmail) {
      sendLegacyJson(response, { status: "2", message: "This Email Address is already registered with us." });
      return;
    }

    const existingByUsername = await this.userRepository.findByUsername(username);
    if (existingByUsername) {
      sendLegacyJson(response, { status: "3", message: "This username is already taken." });
      return;
    }

    const pictureFileName = `${legacyRandomString(10)}.jpg`;
    const picturePath = legacyStoragePublicUrl(request, "profile", pictureFileName);
    await writeBase64File(legacyStorageDiskPath("profile", pictureFileName), encodedProfilePicture);

    const userId = await this.userRepository.createUser({
      name,
      email,
      password,
      username,
      picturePath,
      deviceToken,
      deviceType,
      userType
    });

    let createdUser = await this.userRepository.findByUserId(userId);
    if (!createdUser) {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
      return;
    }

    const stripeCustomer = await this.dependencies.stripeService.createCustomer(createdUser);
    if (stripeCustomer.status === "1" && stripeCustomer.data.stripe_customer_id) {
      await this.userRepository.updateStripeCustomerId(userId, String(stripeCustomer.data.stripe_customer_id));
      createdUser = { ...createdUser, stripe_customer_id: stripeCustomer.data.stripe_customer_id };
    }

    const payload = await this.profileComposer.composeSignupUser(request, createdUser);
    sendLegacyJson(response, {
      status: "1",
      message: "User Signup Successfully",
      data: payload
    });
  };

  public login = async (request: Request, response: Response): Promise<void> => {
    const deviceToken = getLegacyString(request, "device_token");
    const deviceType = getLegacyString(request, "device_type");
    const fbId = getLegacyOptionalString(request, "fb_id");
    const fbEmail = getLegacyOptionalString(request, "fb_email");

    if (fbId && fbEmail) {
      await this.handleFacebookLogin(request, response, {
        fbId,
        fbEmail,
        deviceToken,
        deviceType
      });
      return;
    }

    const username = getLegacyString(request, "username");
    const password = getLegacyString(request, "password");
    const existingUser = await this.userRepository.findByUsername(username);

    if (!existingUser) {
      sendLegacyJson(response, { status: "0", message: "User not found" });
      return;
    }

    if (String(existingUser.user_pass ?? "") !== password) {
      sendLegacyJson(response, { status: "0", message: "Invalid username or password" });
      return;
    }

    let loggedInUser = { ...existingUser };
    if (!loggedInUser.stripe_customer_id) {
      const stripeCustomer = await this.dependencies.stripeService.createCustomer(loggedInUser);
      if (stripeCustomer.status === "1" && stripeCustomer.data.stripe_customer_id) {
        await this.userRepository.updateStripeCustomerId(Number(loggedInUser.user_id), String(stripeCustomer.data.stripe_customer_id));
        loggedInUser = { ...loggedInUser, stripe_customer_id: stripeCustomer.data.stripe_customer_id };
      }
    }

    if (shouldUpdateDeviceToken(deviceToken)) {
      await this.userRepository.updateDevice(Number(loggedInUser.user_id), deviceToken, deviceType);
      loggedInUser = { ...loggedInUser, device_token: deviceToken, device_type: deviceType };
    }

    const payload = await this.profileComposer.composeLoginUser(request, loggedInUser, true);
    sendLegacyJson(response, {
      status: "1",
      message: "Logged in successfully",
      data: payload
    });
  };

  public forgotPassword = async (request: Request, response: Response): Promise<void> => {
    const email = getLegacyOptionalString(request, "email");
    if (!email) {
      sendLegacyJson(response, { status: "0", message: "Email required" });
      return;
    }

    const user = (await this.userRepository.findByEmailOrUsername(email)) ?? null;
    if (!user) {
      sendLegacyJson(response, { status: "0", message: "Email is not registered with droop" });
      return;
    }

    const html = [
      "<html><body>",
      "Hello,",
      "<br/><br/>We received a request for recovering of your Droop account, below are the details for your account.",
      "<br/><br/>Please find below your account details:<br/>",
      `<br/>Username : ${String(user.user_name ?? "")}`,
      `<br/>Email : ${String(user.user_email ?? "")}`,
      `<br/>Password : ${String(user.user_pass ?? "")}`,
      "<br/><br/><br/>Thank you,<br/>Droop Support<br/>Contact Us: support@droopllc.com",
      "</body></html>"
    ].join("");

    const sent = await this.mailService.sendRecoveryMail(
      String(user.user_email ?? ""),
      String(user.user_name ?? ""),
      "Droop - Account Recovery",
      html
    );

    if (sent) {
      sendLegacyJson(response, { status: "1", message: "Recovery Mail sent successfully" });
      return;
    }

    sendLegacyJson(response, { status: "0", message: "Failed to send an email" });
  };

  private async handleFacebookLogin(
    request: Request,
    response: Response,
    input: {
      fbId: string;
      fbEmail: string;
      deviceToken: string;
      deviceType: string;
    }
  ): Promise<void> {
    const existingUser = await this.userRepository.findByFacebookEmail(input.fbEmail);

    if (existingUser) {
      await this.userRepository.updateFacebookLogin(
        Number(existingUser.user_id),
        input.fbId,
        input.deviceToken,
        input.deviceType
      );

      const updatedUser = {
        ...existingUser,
        fb_id: input.fbId,
        ...(shouldUpdateDeviceToken(input.deviceToken)
          ? { device_token: input.deviceToken, device_type: input.deviceType }
          : {})
      };

      const payload = await this.profileComposer.composeLoginUser(request, updatedUser, false);
      sendLegacyJson(response, {
        status: "1",
        message: "Logged in successfully",
        data: payload
      });
      return;
    }

    const name = getLegacyString(request, "name");
    const username = getLegacyString(request, "username");
    const deviceToken = getLegacyString(request, "device_token");
    const deviceType = getLegacyString(request, "device_type");
    const encodedProfilePicture = getLegacyOptionalString(request, "profile_pic");

    let picturePath = "";
    if (encodedProfilePicture) {
      const pictureFileName = `${legacyRandomString(10)}.jpg`;
      picturePath = legacyStoragePublicUrl(request, "profile", pictureFileName);
      await writeBase64File(path.join(legacyStorageDiskPath("profile"), pictureFileName), encodedProfilePicture);
    }

    const userId = await this.userRepository.createUser({
      name,
      email: input.fbEmail,
      username,
      picturePath,
      deviceToken,
      deviceType,
      fbId: input.fbId
    });

    const createdUser = await this.userRepository.findByUserId(userId);
    if (!createdUser) {
      sendLegacyJson(response, { status: "0", message: "Error while adding record in database" });
      return;
    }

    const payload = await this.profileComposer.composeSignupUser(request, createdUser);
    sendLegacyJson(response, {
      status: "1",
      message: "User Signup Successfully",
      data: payload
    });
  }
}
