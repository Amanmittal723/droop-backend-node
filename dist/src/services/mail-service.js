"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
/**
 * Purpose: Provide a lightweight injectable compatibility wrapper for the legacy account-recovery email flow.
 * Expected request body: Callers provide the recipient, subject, and HTML body derived from the PHP logic.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Success or failure booleans used by auth controllers to emit PHP-style payloads.
 */
const node_net_1 = __importDefault(require("node:net"));
const node_tls_1 = __importDefault(require("node:tls"));
const env_1 = require("../config/env");
class MailService {
    async sendRecoveryMail(to, name, subject, html) {
        if (!env_1.env.SMTP_HOST || !env_1.env.SMTP_USERNAME || !env_1.env.SMTP_PASSWORD) {
            return false;
        }
        const socket = env_1.env.smtpSecure
            ? node_tls_1.default.connect({
                host: env_1.env.SMTP_HOST,
                port: env_1.env.SMTP_PORT,
                servername: env_1.env.SMTP_HOST
            })
            : node_net_1.default.createConnection({
                host: env_1.env.SMTP_HOST,
                port: env_1.env.SMTP_PORT
            });
        const connectionReadyEvent = env_1.env.smtpSecure ? "secureConnect" : "connect";
        try {
            await new Promise((resolve, reject) => {
                socket.once(connectionReadyEvent, () => resolve());
                socket.once("error", reject);
            });
            const responses = createSmtpResponseReader(socket);
            const initial = await responses.next();
            if (initial.code !== 220) {
                return false;
            }
            await sendSmtpCommand(socket, responses, `EHLO ${env_1.env.SMTP_HOST}`, [250]);
            await sendSmtpCommand(socket, responses, "AUTH LOGIN", [334]);
            await sendSmtpCommand(socket, responses, Buffer.from(env_1.env.SMTP_USERNAME).toString("base64"), [334]);
            await sendSmtpCommand(socket, responses, Buffer.from(env_1.env.SMTP_PASSWORD).toString("base64"), [235]);
            await sendSmtpCommand(socket, responses, `MAIL FROM:<${env_1.env.smtpFromAddress}>`, [250]);
            await sendSmtpCommand(socket, responses, `RCPT TO:<${to}>`, [250, 251]);
            await sendSmtpCommand(socket, responses, "DATA", [354]);
            const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
            const body = [
                `From: ${formatEmailAddress(env_1.env.smtpFromName, env_1.env.smtpFromAddress)}`,
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
        catch {
            return false;
        }
        finally {
            socket.end();
        }
    }
}
exports.MailService = MailService;
function createSmtpResponseReader(socket) {
    let buffer = "";
    let lines = [];
    const queue = [];
    const waiters = [];
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
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
                }
                else {
                    queue.push(response);
                }
            }
        }
    });
    return {
        next: () => new Promise((resolve) => {
            const queued = queue.shift();
            if (queued) {
                resolve(queued);
                return;
            }
            waiters.push(resolve);
        })
    };
}
async function sendSmtpCommand(socket, responses, command, expectedCodes) {
    await new Promise((resolve, reject) => {
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
function formatEmailAddress(name, email) {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
        return `<${email}>`;
    }
    return `"${trimmedName.replace(/"/g, '\\"')}" <${email}>`;
}
