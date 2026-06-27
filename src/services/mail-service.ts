/**
 * Purpose: Provide a lightweight injectable compatibility wrapper for the legacy account-recovery email flow.
 * Expected request body: Callers provide the recipient, subject, and HTML body derived from the PHP logic.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Success or failure booleans used by auth controllers to emit PHP-style payloads.
 */
import net from "node:net";
import tls from "node:tls";
import { env } from "../config/env";
import { logger } from "../lib/logger";

export class MailService {
  public async sendRecoveryMail(to: string, name: string, subject: string, html: string): Promise<boolean> {
    if (!env.SMTP_HOST || !env.SMTP_USERNAME || !env.SMTP_PASSWORD) {
      logger.warn("Recovery email skipped because SMTP_HOST, SMTP_USERNAME, or SMTP_PASSWORD is not configured");
      return false;
    }

    const smtpUsername = env.SMTP_USERNAME;
    const smtpPassword = env.SMTP_PASSWORD;

    const socket = env.smtpSecure
      ? tls.connect({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          servername: env.SMTP_HOST
        })
      : net.createConnection({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT
        });

    const connectionReadyEvent = env.smtpSecure ? "secureConnect" : "connect";

    try {
      await new Promise<void>((resolve, reject) => {
        socket.once(connectionReadyEvent, () => resolve());
        socket.once("error", reject);
      });

      const responses = createSmtpResponseReader(socket);
      const initial = await responses.next();
      if (initial.code !== 220) {
        logger.error({ smtpResponse: initial.message }, "SMTP server rejected the initial connection");
        return false;
      }

      await sendSmtpCommand(socket, responses, `EHLO ${env.SMTP_HOST}`, [250]);

      if (!env.smtpSecure) {
        await sendSmtpCommand(socket, responses, "STARTTLS", [220]);
        const upgradedSocket = await upgradeSocketWithStartTls(socket, env.SMTP_HOST);
        const upgradedResponses = createSmtpResponseReader(upgradedSocket);
        await sendSmtpCommand(upgradedSocket, upgradedResponses, `EHLO ${env.SMTP_HOST}`, [250]);
        return await this.sendRecoveryMailOverSocket(
          upgradedSocket,
          upgradedResponses,
          to,
          name,
          subject,
          html,
          smtpUsername,
          smtpPassword
        );
      }

      return await this.sendRecoveryMailOverSocket(
        socket,
        responses,
        to,
        name,
        subject,
        html,
        smtpUsername,
        smtpPassword
      );
    } catch (error) {
      logger.error({ err: error }, "Failed to send recovery email");
      return false;
    } finally {
      if (!socket.destroyed) {
        socket.end();
      }
    }
  }

  private async sendRecoveryMailOverSocket(
    socket: net.Socket | tls.TLSSocket,
    responses: { next: () => Promise<{ code: number; message: string }> },
    to: string,
    name: string,
    subject: string,
    html: string,
    smtpUsername: string,
    smtpPassword: string
  ): Promise<boolean> {
    await sendSmtpCommand(socket, responses, "AUTH LOGIN", [334]);
    await sendSmtpCommand(socket, responses, Buffer.from(smtpUsername).toString("base64"), [334]);
    await sendSmtpCommand(socket, responses, Buffer.from(smtpPassword).toString("base64"), [235]);
    await sendSmtpCommand(socket, responses, `MAIL FROM:<${env.smtpFromAddress}>`, [250]);
    await sendSmtpCommand(socket, responses, `RCPT TO:<${to}>`, [250, 251]);
    await sendSmtpCommand(socket, responses, "DATA", [354]);

    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
    const body = [
      `From: ${formatEmailAddress(env.smtpFromName, env.smtpFromAddress)}`,
      `To: ${formatEmailAddress(name, to)}`,
      `Subject: ${encodedSubject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "",
      html.replace(/^\./gm, "..")
    ].join("\r\n");

    await sendSmtpCommand(socket, responses, `${body}\r\n.`, [250]);
    await sendSmtpCommand(socket, responses, "QUIT", [221]);
    return true;
  }
}

function createSmtpResponseReader(socket: net.Socket | tls.TLSSocket): { next: () => Promise<{ code: number; message: string }> } {
  let buffer = "";
  let lines: string[] = [];
  const queue: Array<{ code: number; message: string }> = [];
  const waiters: Array<(response: { code: number; message: string }) => void> = [];

  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    buffer += chunk;

    while (true) {
      const lineEnd = buffer.indexOf("\r\n");
      if (lineEnd === -1) {
        break;
      }

      const line = buffer.slice(0, lineEnd);
      buffer = buffer.slice(lineEnd + 2);
      lines.push(line);

      const match = line.match(/^(\d{3})([ -])/);
      if (!match) {
        continue;
      }

      if (match[2] === " ") {
        const response = {
          code: Number(match[1]),
          message: lines.join("\n")
        };
        lines = [];
        const waiter = waiters.shift();
        if (waiter) {
          waiter(response);
        } else {
          queue.push(response);
        }
      }
    }
  });

  return {
    next: () =>
      new Promise<{ code: number; message: string }>((resolve) => {
        const queued = queue.shift();
        if (queued) {
          resolve(queued);
          return;
        }
        waiters.push(resolve);
      })
  };
}

async function upgradeSocketWithStartTls(socket: net.Socket, host: string): Promise<tls.TLSSocket> {
  return new Promise<tls.TLSSocket>((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      servername: host
    });

    secureSocket.once("secureConnect", () => resolve(secureSocket));
    secureSocket.once("error", reject);
  });
}

async function sendSmtpCommand(
  socket: net.Socket | tls.TLSSocket,
  responses: { next: () => Promise<{ code: number; message: string }> },
  command: string,
  expectedCodes: number[]
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    socket.write(`${command}\r\n`, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  const response = await responses.next();
  if (!expectedCodes.includes(response.code)) {
    throw new Error(`Unexpected SMTP response: ${response.message}`);
  }
}

function formatEmailAddress(name: string, email: string): string {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return `<${email}>`;
  }
  return `"${trimmedName.replace(/"/g, '\\"')}" <${email}>`;
}
