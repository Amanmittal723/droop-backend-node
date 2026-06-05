/**
 * Purpose: Deliver legacy APNs notifications using the same certificate-based curl flow as the PHP backend.
 * Expected request body: Callers provide device tokens, message text, and optional app_data fields.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Best-effort delivery result text suitable for legacy diagnostic endpoints.
 */
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../config/env";

const execFileAsync = promisify(execFile);

type ApnsPayloadInput = {
  message: string;
  dualId?: string;
  friendId?: string;
  userId?: string;
  notificationType?: string;
  isCollaborate?: boolean;
};

export class ApnsService {
  public async sendPush(deviceToken: string, input: ApnsPayloadInput, sandbox: boolean): Promise<string> {
    const certPath = sandbox ? env.apnsDevCertPath : env.apnsCertPath;
    await fs.access(certPath);

    const payload = buildPayload(input);
    const args = [
      "--silent",
      "--show-error",
      "--http2",
      "--cert",
      certPath,
      "--header",
      `apns-topic: ${env.apnsTopic}`,
      "--header",
      "apns-push-type: alert",
      "--data",
      JSON.stringify(payload),
      `${sandbox ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com"}/3/device/${deviceToken}`
    ];

    if (env.APNS_CERT_PASSPHRASE !== undefined) {
      args.splice(4, 0, "--pass", env.APNS_CERT_PASSPHRASE);
    }

    const { stdout, stderr } = await execFileAsync("curl", args, { maxBuffer: 1024 * 1024 });
    return `${stdout}${stderr}`.trim();
  }
}

function buildPayload(input: ApnsPayloadInput): Record<string, unknown> {
  const appData: Record<string, unknown> = {};

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
