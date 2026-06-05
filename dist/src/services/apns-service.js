"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApnsService = void 0;
/**
 * Purpose: Deliver legacy APNs notifications using the same certificate-based curl flow as the PHP backend.
 * Expected request body: Callers provide device tokens, message text, and optional app_data fields.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Best-effort delivery result text suitable for legacy diagnostic endpoints.
 */
const promises_1 = __importDefault(require("node:fs/promises"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const env_1 = require("../config/env");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
class ApnsService {
    async sendPush(deviceToken, input, sandbox) {
        const certPath = sandbox ? env_1.env.apnsDevCertPath : env_1.env.apnsCertPath;
        await promises_1.default.access(certPath);
        const payload = buildPayload(input);
        const args = [
            "--silent",
            "--show-error",
            "--http2",
            "--cert",
            certPath,
            "--header",
            `apns-topic: ${env_1.env.apnsTopic}`,
            "--header",
            "apns-push-type: alert",
            "--data",
            JSON.stringify(payload),
            `${sandbox ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com"}/3/device/${deviceToken}`
        ];
        if (env_1.env.APNS_CERT_PASSPHRASE !== undefined) {
            args.splice(4, 0, "--pass", env_1.env.APNS_CERT_PASSPHRASE);
        }
        const { stdout, stderr } = await execFileAsync("curl", args, { maxBuffer: 1024 * 1024 });
        return `${stdout}${stderr}`.trim();
    }
}
exports.ApnsService = ApnsService;
function buildPayload(input) {
    const appData = {};
    if (input.dualId) {
        appData.dual_id = input.dualId;
        if (input.isCollaborate) {
            appData.is_collaborate = true;
        }
    }
    if (input.friendId) {
        appData.friend_id = input.friendId;
    }
    if (input.userId) {
        appData.user_id = input.userId;
    }
    appData.notification_type = input.notificationType ?? 0;
    return {
        aps: {
            alert: {
                body: input.message
            },
            type: "sky_load",
            badge: 1,
            sound: "default",
            "mutable-content": "1",
            image_url: "image-url"
        },
        app_data: appData
    };
}
