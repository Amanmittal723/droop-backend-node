/**
 * Purpose: Recreate legacy diagnostics, push, and SQLite compatibility endpoints.
 * Expected request body: stream_name, username, password, limit, include_hash, and legacy push fields.
 * Expected query parameters: Legacy clients may send the same keys via query string and they are merged like $_REQUEST.
 * Expected headers: Standard HTTP headers.
 * Expected response structure: Legacy HTML, JSON, or raw text responses matching historical scripts.
 */
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Request, Response } from "express";
import { getLegacyOptionalString } from "../lib/legacy-request";
import { LegacyRow } from "../lib/legacy-row";
import { sendLegacyJson } from "../lib/legacy-response";
import { escapeSql } from "../lib/legacy-sql";
import { LegacyBaseController, LegacyControllerDependencies } from "./base-controller";

const execFileAsync = promisify(execFile);

export class LegacyDiagnosticsController extends LegacyBaseController {
  public constructor(dependencies: LegacyControllerDependencies) {
    super(dependencies);
  }

  public playvideo = async (_request: Request, response: Response): Promise<void> => {
    response.type("html").send(`
<html>
<body>
<script type='text/javascript' src='swfobject.js'></script>
<div id='mediaspace'>Playing FLV</div>
<object width="400" height="409" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0">
  <param name="allowscriptaccess" value="always"></param>
  <param name="file" value="cocaine">
  <embed height="500" width="650" flashvars="file=BigBuckBunny_115k.mov&amp;streamer=rtmp://184.72.239.149/vod&amp;rtmp.subscribe=false&amp;quality=best&amp;controlbar=bottom&amp;rtmp.tunneling=false&amp;frontcolor=#fff&amp;backcolor=#000&amp;stretching=exactfit&amp;autostart=true" wmode="transparent" allowfullscreen="true" allowscriptaccess="always" quality="high" src="http://s.zuuk.net/ply.swf" type="application/x-shockwave-flash"/>
</object>
</body>
</html>`);
  };

  public sendNotification = async (request: Request, response: Response): Promise<void> => {
    await this.sendLegacyPush(request, false);
    response.type("html").send("<p>Message successfully delivered</p>");
  };

  public sendNotificationDev = async (request: Request, response: Response): Promise<void> => {
    await this.sendLegacyPush(request, true);
    response.type("html").send("<p>Message successfully delivered</p>");
  };

  public test = async (_request: Request, response: Response): Promise<void> => {
    response.type("html").send("<html><body><pre>phpinfo()</pre></body></html>");
  };

  public testCurl = async (_request: Request, response: Response): Promise<void> => {
    response.type("html").send("CURL is available on your web server\nNotifiation sent");
  };

  public testWowza = async (_request: Request, response: Response): Promise<void> => {
    response.type("html").send("Required field(s) is missing");
  };

  public testPush = async (_request: Request, response: Response): Promise<void> => {
    response.type("html").send("<p>Message successfully delivered</p>");
  };

  public startstream = async (request: Request, response: Response): Promise<void> => {
    const streamName = getLegacyOptionalString(request, "stream_name");
    if (!streamName) {
      sendLegacyJson(response, { success: 0, message: "Required field(s) is missing" });
      return;
    }
    try {
      const payload = await this.wowzaService.startSandboxStream(streamName);
      response.send(payload);
    } catch (error) {
      response.send(`Error:${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  public sqliteUsers = async (request: Request, response: Response): Promise<void> => {
    const envPath = process.env.DROOP_SQLITE_PATH ?? "/Users/kunalrohilla/Downloads/storage.sqlite";
    try {
      await fs.access(envPath);
    } catch {
      response.status(500).json({
        status: 0,
        message: "SQLite database file was not found.",
        database_path: envPath
      });
      return;
    }

    const requestedUsername = (getLegacyOptionalString(request, "username") ?? "").trim();
    const parsedLimit = Number(getLegacyOptionalString(request, "limit") ?? "50");
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 500) : 50;
    const includeHash = (getLegacyOptionalString(request, "include_hash") ?? "1") !== "0";
    const columns = [
      "username",
      "real_name",
      "alternate_email",
      "phone_number",
      "domain",
      "type",
      "guid",
      "avatar_url",
      "digest_auth_hash",
      "synced_password",
      "has_invite",
      "invite_expiration"
    ];
    if (includeHash) {
      columns.push("password_hash");
    }

    let sql = `SELECT ${columns.join(", ")} FROM users`;
    if (requestedUsername.length > 0) {
      sql += ` WHERE username = '${escapeSql(requestedUsername)}'`;
    }
    sql += ` ORDER BY username ASC LIMIT ${limit}`;

    let users: LegacyRow[];
    try {
      const { stdout } = await execFileAsync("sqlite3", [envPath, "-json", sql], { maxBuffer: 1024 * 1024 });
      users = stdout.trim().length > 0 ? (JSON.parse(stdout) as LegacyRow[]) : [];
    } catch (error) {
      response.status(500).json({
        status: 0,
        message: "Failed to query users table.",
        database_path: envPath,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      return;
    }

    const payload: Record<string, unknown> = {
      status: 1,
      database_path: envPath,
      requested_username: requestedUsername,
      returned_count: users.length,
      users
    };

    const submittedPassword = getLegacyOptionalString(request, "password");
    if (submittedPassword && requestedUsername.length > 0 && users.length === 1 && includeHash) {
      const storedHash = String(users[0].password_hash ?? "");
      try {
        const { stdout } = await execFileAsync(
          "php",
          ["-r", "echo password_verify($argv[1], $argv[2]) ? '1' : '0';", submittedPassword, storedHash],
          { maxBuffer: 1024 * 1024 }
        );
        payload.password_check = {
          password_verify_match: stdout.trim() === "1"
        };
      } catch {
        payload.password_check = {
          password_verify_match: false
        };
      }
    }

    response.status(200).json(payload);
  };
}
