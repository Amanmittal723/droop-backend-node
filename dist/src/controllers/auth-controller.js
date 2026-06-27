"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
/**
 * Purpose: Recreate the legacy PHP signup and login flows, including Facebook login behavior and Stripe side effects.
 * Expected request body: name, email, pass, username, device_token, device_type, profile_pic, user_type, password, fb_id, fb_email.
 * Expected query parameters: Legacy clients may also send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Host headers are used for generated storage URLs and Stripe connect URLs.
 * Expected response structure: Legacy JSON payloads with status, message, and optional data matching the PHP scripts.
 */
const node_path_1 = __importDefault(require("node:path"));
const legacy_request_1 = require("../lib/legacy-request");
const legacy_response_1 = require("../lib/legacy-response");
const random_1 = require("../lib/random");
const storage_1 = require("../lib/storage");
const metadata_repository_1 = require("../repositories/metadata-repository");
const user_repository_1 = require("../repositories/user-repository");
const profile_composer_1 = require("../services/profile-composer");
const auth_validator_1 = require("../validators/auth-validator");
class AuthController {
    dependencies;
    metadataRepository;
    userRepository;
    profileComposer;
    mailService;
    constructor(dependencies) {
        this.dependencies = dependencies;
        this.metadataRepository = new metadata_repository_1.MetadataRepository(dependencies.prismaClient);
        this.userRepository = new user_repository_1.UserRepository(dependencies.prismaClient);
        this.profileComposer = new profile_composer_1.ProfileComposerService(this.metadataRepository, this.userRepository, dependencies.stripeService);
        this.mailService = dependencies.mailService;
    }
    checkEmail = async (request, response) => {
        const email = (0, auth_validator_1.normalizeLegacyEmail)((0, legacy_request_1.getLegacyString)(request, "email"));
        if (email.length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "2", message: "Email address is required." });
            return;
        }
        if (!(0, auth_validator_1.isValidLegacyEmail)(email)) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "2", message: "Please enter a valid email address." });
            return;
        }
        const existingByEmail = await this.userRepository.findByEmail(email);
        if (existingByEmail) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "2", message: "This Email Address is already registered with us." });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Email address is available." });
    };
    checkUsername = async (request, response) => {
        const username = (0, auth_validator_1.trimLegacyUsername)((0, legacy_request_1.getLegacyString)(request, "username"));
        if (username.length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "2", message: "Username is required." });
            return;
        }
        const existingByUsername = await this.userRepository.findByUsername(username);
        if (existingByUsername) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "3", message: "This username is already taken." });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Username is available." });
    };
    signupEmail = async (request, response) => {
        const email = (0, auth_validator_1.normalizeLegacyEmail)((0, legacy_request_1.getLegacyString)(request, "email"));
        const username = (0, auth_validator_1.trimLegacyUsername)((0, legacy_request_1.getLegacyString)(request, "username"));
        const password = (0, legacy_request_1.getLegacyString)(request, "pass") || (0, legacy_request_1.getLegacyString)(request, "password");
        const deviceToken = (0, legacy_request_1.getLegacyString)(request, "device_token");
        const deviceType = (0, legacy_request_1.getLegacyString)(request, "device_type", "iOS");
        const userType = (0, legacy_request_1.getLegacyString)(request, "user_type", "1");
        if (email.length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "2", message: "Email address is required." });
            return;
        }
        if (!(0, auth_validator_1.isValidLegacyEmail)(email)) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "2", message: "Please enter a valid email address." });
            return;
        }
        if (username.length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "2", message: "Username is required." });
            return;
        }
        if (password.length < 8) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "2", message: "Password must be at least 8 characters." });
            return;
        }
        const existingByEmail = await this.userRepository.findByEmail(email);
        if (existingByEmail) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "2", message: "This Email Address is already registered with us." });
            return;
        }
        const existingByUsername = await this.userRepository.findByUsername(username);
        if (existingByUsername) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "3", message: "This username is already taken." });
            return;
        }
        const userId = await this.userRepository.createUser({
            name: username,
            email,
            password,
            username,
            picturePath: "",
            deviceToken,
            deviceType,
            userType
        });
        let createdUser = await this.userRepository.findByUserId(userId);
        if (!createdUser) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
            return;
        }
        const stripeCustomer = await this.dependencies.stripeService.createCustomer(createdUser);
        if (stripeCustomer.status === "1" && stripeCustomer.data.stripe_customer_id) {
            await this.userRepository.updateStripeCustomerId(userId, String(stripeCustomer.data.stripe_customer_id));
            createdUser = { ...createdUser, stripe_customer_id: stripeCustomer.data.stripe_customer_id };
        }
        const payload = await this.profileComposer.composeSignupUser(request, createdUser);
        (0, legacy_response_1.sendLegacyJson)(response, {
            status: "1",
            message: "User Signup Successfully",
            data: payload
        });
    };
    signup = async (request, response) => {
        const name = (0, legacy_request_1.getLegacyString)(request, "name");
        const email = (0, legacy_request_1.getLegacyString)(request, "email");
        const password = (0, legacy_request_1.getLegacyString)(request, "pass");
        const username = (0, auth_validator_1.trimLegacyUsername)((0, legacy_request_1.getLegacyString)(request, "username"));
        const deviceToken = (0, legacy_request_1.getLegacyString)(request, "device_token");
        const deviceType = (0, legacy_request_1.getLegacyString)(request, "device_type");
        const encodedProfilePicture = (0, legacy_request_1.getLegacyString)(request, "profile_pic");
        const userType = (0, legacy_request_1.getLegacyString)(request, "user_type", "1");
        if (username.length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "2", message: "Username is required." });
            return;
        }
        const existingByEmail = await this.userRepository.findByEmail(email);
        if (existingByEmail) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "2", message: "This Email Address is already registered with us." });
            return;
        }
        const existingByUsername = await this.userRepository.findByUsername(username);
        if (existingByUsername) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "3", message: "This username is already taken." });
            return;
        }
        const pictureFileName = `${(0, random_1.legacyRandomString)(10)}.jpg`;
        const picturePath = (0, storage_1.legacyStoragePublicUrl)(request, "profile", pictureFileName);
        await (0, storage_1.writeBase64File)((0, storage_1.legacyStorageDiskPath)("profile", pictureFileName), encodedProfilePicture);
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
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
            return;
        }
        const stripeCustomer = await this.dependencies.stripeService.createCustomer(createdUser);
        if (stripeCustomer.status === "1" && stripeCustomer.data.stripe_customer_id) {
            await this.userRepository.updateStripeCustomerId(userId, String(stripeCustomer.data.stripe_customer_id));
            createdUser = { ...createdUser, stripe_customer_id: stripeCustomer.data.stripe_customer_id };
        }
        const payload = await this.profileComposer.composeSignupUser(request, createdUser);
        (0, legacy_response_1.sendLegacyJson)(response, {
            status: "1",
            message: "User Signup Successfully",
            data: payload
        });
    };
    login = async (request, response) => {
        const deviceToken = (0, legacy_request_1.getLegacyString)(request, "device_token");
        const deviceType = (0, legacy_request_1.getLegacyString)(request, "device_type");
        const fbId = (0, legacy_request_1.getLegacyOptionalString)(request, "fb_id");
        const fbEmail = (0, legacy_request_1.getLegacyOptionalString)(request, "fb_email");
        if (fbId && fbEmail) {
            await this.handleFacebookLogin(request, response, {
                fbId,
                fbEmail,
                deviceToken,
                deviceType
            });
            return;
        }
        const email = (0, auth_validator_1.normalizeLegacyEmail)((0, legacy_request_1.getLegacyString)(request, "email") || (0, legacy_request_1.getLegacyString)(request, "username"));
        const password = (0, legacy_request_1.getLegacyString)(request, "password");
        if (email.length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Email address is required." });
            return;
        }
        if (!(0, auth_validator_1.isValidLegacyEmail)(email)) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Please enter a valid email address." });
            return;
        }
        if (password.length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Password is required." });
            return;
        }
        const existingUser = await this.userRepository.findByLoginEmail(email);
        if (!existingUser) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "User not found" });
            return;
        }
        if (String(existingUser.user_pass ?? "") !== password) {
            (0, legacy_response_1.sendLegacyJson)(response, {
                status: "0",
                message: "Invalid email or password"
            });
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
        if ((0, auth_validator_1.shouldUpdateDeviceToken)(deviceToken)) {
            await this.userRepository.updateDevice(Number(loggedInUser.user_id), deviceToken, deviceType);
            loggedInUser = { ...loggedInUser, device_token: deviceToken, device_type: deviceType };
        }
        const payload = await this.profileComposer.composeLoginUser(request, loggedInUser, true);
        (0, legacy_response_1.sendLegacyJson)(response, {
            status: "1",
            message: "Logged in successfully",
            data: payload
        });
    };
    forgotPassword = async (request, response) => {
        const identifier = (0, legacy_request_1.getLegacyOptionalString)(request, "email") ?? "";
        if (identifier.trim().length <= 0) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Email required" });
            return;
        }
        if (identifier.includes("@") && !(0, auth_validator_1.isValidLegacyEmail)(identifier.trim())) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Please enter a valid email address." });
            return;
        }
        const user = (await this.userRepository.findForAccountRecovery(identifier)) ?? null;
        if (!user) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Email is not registered with droop" });
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
        const sent = await this.mailService.sendRecoveryMail(String(user.user_email ?? ""), String(user.user_name ?? ""), "Droop - Account Recovery", html);
        if (sent) {
            (0, legacy_response_1.sendLegacyJson)(response, { status: "1", message: "Recovery Mail sent successfully" });
            return;
        }
        (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Failed to send an email" });
    };
    async handleFacebookLogin(request, response, input) {
        const existingUser = await this.userRepository.findByFacebookEmail(input.fbEmail);
        if (existingUser) {
            await this.userRepository.updateFacebookLogin(Number(existingUser.user_id), input.fbId, input.deviceToken, input.deviceType);
            const updatedUser = {
                ...existingUser,
                fb_id: input.fbId,
                ...((0, auth_validator_1.shouldUpdateDeviceToken)(input.deviceToken)
                    ? { device_token: input.deviceToken, device_type: input.deviceType }
                    : {})
            };
            const payload = await this.profileComposer.composeLoginUser(request, updatedUser, false);
            (0, legacy_response_1.sendLegacyJson)(response, {
                status: "1",
                message: "Logged in successfully",
                data: payload
            });
            return;
        }
        const name = (0, legacy_request_1.getLegacyString)(request, "name");
        const username = (0, legacy_request_1.getLegacyString)(request, "username");
        const deviceToken = (0, legacy_request_1.getLegacyString)(request, "device_token");
        const deviceType = (0, legacy_request_1.getLegacyString)(request, "device_type");
        const encodedProfilePicture = (0, legacy_request_1.getLegacyOptionalString)(request, "profile_pic");
        let picturePath = "";
        if (encodedProfilePicture) {
            const pictureFileName = `${(0, random_1.legacyRandomString)(10)}.jpg`;
            picturePath = (0, storage_1.legacyStoragePublicUrl)(request, "profile", pictureFileName);
            await (0, storage_1.writeBase64File)(node_path_1.default.join((0, storage_1.legacyStorageDiskPath)("profile"), pictureFileName), encodedProfilePicture);
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
            (0, legacy_response_1.sendLegacyJson)(response, { status: "0", message: "Error while adding record in database" });
            return;
        }
        const payload = await this.profileComposer.composeSignupUser(request, createdUser);
        (0, legacy_response_1.sendLegacyJson)(response, {
            status: "1",
            message: "User Signup Successfully",
            data: payload
        });
    }
}
exports.AuthController = AuthController;
