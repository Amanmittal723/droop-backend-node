#!/usr/bin/env node
/**
 * Purpose: Run a compatibility smoke pass across the migrated Droop PHP routes.
 * Usage: SMOKE_BASE_URL=http://127.0.0.1:3001 node scripts/smoke-endpoints.cjs
 * Output: Writes a JSON report to stdout and /private/tmp/droop-smoke-report.json.
 */
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ROUTE_MAP_PATH = path.join(ROOT, "artifacts", "route-map.json");
const ROUTES_PATH = path.join(ROOT, "src", "routes", "categories.ts");
const DEFAULT_BASE_URL = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3001";
const SKIP_ROUTES = new Set([
  "/categories/APICall.php",
  "/categories/business.cls.php",
  "/categories/category.cls.php",
  "/categories/database.php",
  "/categories/database2.php",
  "/categories/check_wowza.php",
  "/categories/create_wowza_stream.php",
  "/categories/get_streams.php",
  "/categories/interest.cls.php",
  "/categories/mysql-wrapper.php",
  "/categories/storage.php",
  "/categories/stripe.cls.php",
  "/categories/start_stream.php",
  "/categories/startstream.php",
  "/categories/stream_state.php"
]);

const GET_ONLY_ROUTES = new Set([
  "/categories/health.php",
  "/categories/stripe_success.php"
]);

const DESRUCTIVE_ROUTES = new Set([
  "/categories/clearchat.php",
  "/categories/deleteNotifications.php",
  "/categories/deleteStory.php",
  "/categories/deldualpost.php",
  "/categories/delUser.php",
  "/categories/delVenture.php"
]);

const DATE = "2026-06-05";
const TIME = "10:00";
const DEMO_BASE64 = Buffer.from("smoke", "utf8").toString("base64");
const BLOBS = {
  image: new Blob([Buffer.from("smoke-image")], { type: "image/jpeg" }),
  video: new Blob([Buffer.from("smoke-video")], { type: "video/mp4" }),
  thumb: new Blob([Buffer.from("smoke-thumb")], { type: "image/jpeg" })
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const routeMap = JSON.parse(await fs.readFile(ROUTE_MAP_PATH, "utf8"));
  const routeMethods = await buildRouteMethods();

  const report = {
    baseUrl: DEFAULT_BASE_URL,
    startedAt: new Date().toISOString(),
    tested: [],
    skipped: [],
    failures: [],
    notes: []
  };

  await seedUsefulState();

  const orderedRoutes = [];
  const destructiveRoutes = [];
  for (const entry of routeMap) {
    const route = entry.route.startsWith("/categories/") ? entry.route : `/categories/${entry.route}`;
    if (SKIP_ROUTES.has(route)) {
      report.skipped.push({ route, reason: "stream APIs skipped per request" });
      continue;
    }
    if (DESRUCTIVE_ROUTES.has(route)) {
      destructiveRoutes.push({ route, entry });
      continue;
    }
    orderedRoutes.push({ route, entry });
  }

  for (const { route, entry } of orderedRoutes.concat(destructiveRoutes)) {
    const method = GET_ONLY_ROUTES.has(route) ? "GET" : routeMethods.get(route) || "POST";
    const runResult = await runRoute(route, method, entry.requestKeys || []);
    report.tested.push(runResult);
    if (runResult.outcome !== "ok") {
      report.failures.push(runResult);
    }
  }

  report.finishedAt = new Date().toISOString();
  report.summary = summarize(report);

  const output = JSON.stringify(report, null, 2);
  await fs.writeFile("/private/tmp/droop-smoke-report.json", output);
  console.log(output);
}

async function buildRouteMethods() {
  const source = await fs.readFile(ROUTES_PATH, "utf8");
  const methods = new Map();
  const regex = /router\.(get|post|all)\("([^"]+)"/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    methods.set(`/categories/${match[2]}`, match[1].toUpperCase());
  }
  return methods;
}

async function seedUsefulState() {
  await postJson("/categories/save_dual.php", {
    saved_by: "1",
    dual_id: "1",
    isDelete: "NO"
  });

  await postJson("/categories/love_dual.php", {
    loved_by: "1",
    dual_id: "1",
    isDelete: "NO",
    user_name: "demoone"
  });

  await postJson("/categories/follow_user.php", {
    followed_by: "3",
    following_id: "2",
    user_name: "demothree",
    isDelete: "NO"
  });

  await postJson("/categories/block_user.php", {
    user_id: "3",
    block_id: "2",
    isDelete: "NO"
  });

  await postJson("/categories/mute_user.php", {
    user_id: "3",
    mute_id: "2",
    isDelete: "NO"
  });
}

async function runRoute(route, method, requestKeys) {
  try {
    const request = buildRequest(route, method, requestKeys);
    const response = await fetch(`${DEFAULT_BASE_URL}${request.path}${request.query || ""}`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "manual"
    });
    const rawText = await response.text();
    const parsed = parseResponse(response, rawText);
    return {
      route,
      method: request.method,
      requestKeys,
      status: response.status,
      contentType: response.headers.get("content-type"),
      location: response.headers.get("location"),
      bodyKind: parsed.kind,
      bodyKeys: parsed.keys,
      bodyPreview: parsed.preview,
      outcome: response.status < 400 ? "ok" : "http_error"
    };
  } catch (error) {
    return {
      route,
      method,
      requestKeys,
      outcome: "request_failed",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function buildRequest(route, method, requestKeys) {
  const lowerRoute = route.toLowerCase();
  const params = {};
  const wantsMultipart =
    lowerRoute.includes("addstory.php") ||
    lowerRoute.includes("addvideopost.php") ||
    lowerRoute.includes("addventure.php") ||
    lowerRoute.includes("uploadventure.php") ||
    lowerRoute.includes("send_message.php");

  if (lowerRoute.includes("signup.php")) {
    const suffix = Date.now().toString(36);
    params.name = `Smoke User ${suffix}`;
    params.email = `smoke_${suffix}@example.com`;
    params.pass = "password123";
    params.password = "password123";
    params.username = `smoke_${suffix}`;
    params.device_token = `device_${suffix}_token`;
    params.device_type = "ios";
    params.profile_pic = DEMO_BASE64;
    params.user_type = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("login.php") || lowerRoute.includes("login2.php") || lowerRoute.includes("login_test.php")) {
    params.username = "demoone";
    params.password = "password123";
    params.device_token = "abcdefghijklmnop";
    params.device_type = "ios";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("forgot_pass.php")) {
    params.email = "demo1@example.com";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("change_pass.php")) {
    params.user_id = "1";
    params.old_password = "password123";
    params.new_password = "password123";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("updateprofile.php")) {
    params.user_id = "1";
    params.user_name = "demoone";
    params.location = "Smoke City";
    params.user_bio = "Smoke bio";
    params.user_state = "Smoke State";
    params.hide_audience = "0";
    params.profile_pic = DEMO_BASE64;
    params.fileName = "smoke.jpg";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("postventure.php")) {
    params.user_id = "1";
    params.venture_title = "Smoke Venture";
    params.venture_url = "https://example.com";
    params.venture_thumb = DEMO_BASE64;
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("uploadventure.php")) {
    params.venture_video = DEMO_BASE64;
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("addstory.php")) {
    params.user_id = "1";
    params.story_type = "1";
    params.story_date = DATE;
    params.story_time = TIME;
    params.story_image = BLOBS.image;
    return finalize(method, route, params, true);
  }

  if (lowerRoute.includes("deleteStory.php".toLowerCase())) {
    params.user_id = "1";
    params.story_id = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("addvideopost.php")) {
    params.user_id = "1";
    params.user_name = "demoone";
    params.user_pic = "https://example.com/profile.jpg";
    params.video_title = "Smoke Video";
    params.video_cost = "0";
    params.dual_linked_to = "2";
    params.dual_linked_name = "demotwo";
    params.dual_linked_propic = "https://example.com/profile2.jpg";
    params.dual_date = DATE;
    params.dual_time = TIME;
    params.receiver_notes = "Smoke notes";
    params.receiver_user_status = "0";
    params.collab_price = "0";
    params.card_id = "";
    params.tagged_user_ids = "2";
    params.category_ids = "1";
    params.interest_ids = "1";
    params.video_thumb = BLOBS.thumb;
    params.video = BLOBS.video;
    return finalize(method, route, params, true);
  }

  if (lowerRoute.includes("post_dualpost.php")) {
    params.user_id = "1";
    params.user_name = "demoone";
    params.user_pic = "https://example.com/profile.jpg";
    params.dualP_title = "Smoke Dual";
    params.dual_linked_to = "-1";
    params.dual_date = DATE;
    params.dual_time = TIME;
    params.dual_linked_name = "NA";
    params.dual_linked_propic = "NA";
    params.receiver_notes = "Smoke notes";
    params.receiver_user_status = "0";
    params.collab_price = "0";
    params.card_id = "";
    params.tagged_user_ids = "2";
    params.category_ids = "1";
    params.interest_ids = "1";
    params.dual_pic = DEMO_BASE64;
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("addlivepost.php")) {
    params.user_id = "2";
    params.streamname = "smoke-live";
    params.streamtitle = "Smoke Live";
    params.streamcost = "0";
    params.live_thumb = DEMO_BASE64;
    params.thumb_url = "";
    params.pool_id = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("send_message.php")) {
    params.message_sender = "1";
    params.message_receiver = "2";
    params.message_type = "0";
    params.message_content = "Smoke message";
    params.dual_id = "1";
    params.message_url = "";
    params.thumb_url = "";
    return finalize(method, route, params, true);
  }

  if (lowerRoute.includes("post_comment.php")) {
    params.broadcast_id = "1";
    params.comment_by = "1";
    params.comment_txt = "Smoke comment";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("addcontacts.php")) {
    params.user_id = "1";
    params.emails = ["smoke_contact@example.com"];
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("save_dual.php")) {
    params.saved_by = "1";
    params.dual_id = "1";
    params.isDelete = "NO";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("love_dual.php")) {
    params.loved_by = "1";
    params.dual_id = "1";
    params.isDelete = "NO";
    params.user_name = "demoone";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("wantdual.php")) {
    params.user_id = "1";
    params.dual_id = "1";
    params.user_name = "demoone";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("sharedual.php")) {
    params.dual_id = "1";
    params.shared_by = "1";
    params.share_with = "2";
    params.message_content = "Smoke share";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("shareventure.php")) {
    params.shared_by = "1";
    params.share_with = "2";
    params.message_content = "Smoke venture share";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("asking_set_price_notification.php")) {
    params.from_user_id = "1";
    params.to_user_id = "2";
    params.user_name = "demoone";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("follow_user.php")) {
    params.followed_by = "3";
    params.following_id = "2";
    params.user_name = "demothree";
    params.isDelete = "NO";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("block_user.php")) {
    params.user_id = "3";
    params.block_id = "2";
    params.isDelete = "NO";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("mute_user.php")) {
    params.user_id = "3";
    params.mute_id = "2";
    params.isDelete = "NO";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("clearchat.php")) {
    params.user_id = "3";
    params.friend_id = "2";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("markread.php")) {
    params.user_id = "1";
    params.sender_id = "2";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("deletenotifications.php")) {
    params.notification_id = "1";
    params.user_id = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("marknotification.php")) {
    params.user_id = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("getmessages.php")) {
    params.user_id = "1";
    params.friend_id = "2";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("getthread")) {
    params.user_id = "1";
    params.start = "0";
    params.page_size = "10";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("getnotifications.php")) {
    params.user_id = "1";
    params.start = "0";
    params.page_size = "10";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("getlivefeed.php")) {
    params.user_id = "1";
    params.screen = "home";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("getventures.php")) {
    params.user_id = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("getventuredet.php")) {
    params.venture_id = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("search")) {
    params.search_txt = "demo";
    params.user_id = "1";
    params.start = "0";
    params.page_size = "10";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("getbrows") || lowerRoute.includes("getduals") || lowerRoute.includes("getpostfeed") || lowerRoute.includes("getuserduals") || lowerRoute.includes("getsave") || lowerRoute.includes("getlove") || lowerRoute.includes("getsuggestedvideos") || lowerRoute.includes("getuserdetail") || lowerRoute.includes("getstories") || lowerRoute.includes("getpostbyinterest")) {
    params.user_id = "1";
    params.logged_user_id = "1";
    params.start = "0";
    params.page_size = "10";
    params.type = "post";
    params.screen = "home";
    params.random = "0";
    params.seed = "123";
    params.category_ids = "1";
    params.interest_ids = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("gettaggeduserdetails.php")) {
    params.user_ids = "1,2";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("getdualdet.php") || lowerRoute.includes("getdualpostviews.php") || lowerRoute.includes("viewdualpost.php")) {
    params.dual_id = "1";
    params.user_id = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("reportdual.php") || lowerRoute.includes("reportlive.php") || lowerRoute.includes("reportventure.php")) {
    params.dual_id = "1";
    params.live_id = "1";
    params.venture_id = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("deletedstory".toLowerCase())) {
    params.user_id = "1";
    params.story_id = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("deleteStory.php".toLowerCase())) {
    params.user_id = "1";
    params.story_id = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("liststripecard.php") || lowerRoute.includes("deletestripecard.php") || lowerRoute.includes("addstripecard.php")) {
    params.stripe_customer_id = "cus_smoke";
    params.card_id = "card_smoke";
    params.token = "tok_visa";
    params.username = "demoone";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("stripe_connect.php")) {
    params.user_id = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("stripe_redirect_url.php")) {
    params.code = "invalid_code";
    params.state = Buffer.from("1_1234567890").toString("base64");
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("stripe_refresh.php")) {
    params.user_id = "1";
    return finalize(method, route, params, false);
  }

  if (lowerRoute.includes("sqlite_users.php")) {
    const sqlitePath = process.env.DROOP_SQLITE_PATH || path.join(ROOT, "..", "droop-backend", "storage.sqlite");
    params.username = "demoone";
    params.limit = "5";
    params.include_hash = "0";
    return {
      method: "GET",
      path: route,
      query: `?username=${encodeURIComponent(params.username)}&limit=${encodeURIComponent(params.limit)}&include_hash=${encodeURIComponent(params.include_hash)}`
    };
  }

  // Generic fallback.
  for (const key of requestKeys) {
    params[key] = genericValue(key);
  }

  return finalize(method, route, params, wantsMultipart);
}

function finalize(method, route, params, forceMultipart) {
  if (method === "GET") {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          qs.append(key, String(item));
        }
      } else {
        qs.set(key, String(value));
      }
    }
    return { method: "GET", path: route, query: `?${qs.toString()}` };
  }

  if (forceMultipart || Object.values(params).some((value) => value instanceof Blob || Array.isArray(value))) {
    const form = new FormData();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          form.append(key, String(item));
        }
      } else if (value instanceof Blob) {
        const filename = key.includes("video") ? `${key}.mp4` : `${key}.jpg`;
        form.append(key, value, filename);
      } else {
        form.append(key, String(value));
      }
    }
    return { method, path: route, body: form };
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        form.append(key, String(item));
      }
    } else {
      form.append(key, String(value));
    }
  }
  return { method, path: route, body: form };
}

function genericValue(key) {
  const lower = key.toLowerCase();
  if (lower.includes("email")) return "demo1@example.com";
  if (lower.includes("username")) return "demoone";
  if (lower.includes("name")) return "demoone";
  if (lower.includes("password")) return "password123";
  if (lower.includes("device_token")) return "abcdefghijklmnop";
  if (lower.includes("device_type")) return "ios";
  if (lower.includes("user_id")) return "1";
  if (lower.includes("logged_user_id")) return "1";
  if (lower.includes("friend_id")) return "2";
  if (lower.includes("followed_by")) return "1";
  if (lower.includes("following_id")) return "2";
  if (lower.includes("block_id")) return "2";
  if (lower.includes("mute_id")) return "2";
  if (lower.includes("saved_by")) return "1";
  if (lower.includes("loved_by")) return "1";
  if (lower.includes("dual_id")) return "1";
  if (lower.includes("story_id")) return "1";
  if (lower.includes("live_id")) return "1";
  if (lower.includes("venture_id")) return "1";
  if (lower.includes("notification_id")) return "1";
  if (lower.includes("comment_id")) return "1";
  if (lower.includes("sender_id")) return "2";
  if (lower.includes("message_sender")) return "1";
  if (lower.includes("message_receiver")) return "2";
  if (lower.includes("message_type")) return "0";
  if (lower.includes("message_content")) return "Smoke message";
  if (lower.includes("message_url")) return "https://example.com/message.mp4";
  if (lower.includes("thumb_url")) return "https://example.com/thumb.jpg";
  if (lower.includes("story_type")) return "1";
  if (lower.includes("story_date")) return DATE;
  if (lower.includes("story_time")) return TIME;
  if (lower.includes("dual_date")) return DATE;
  if (lower.includes("dual_time")) return TIME;
  if (lower.includes("date_time")) return `${DATE} ${TIME}`;
  if (lower.includes("start")) return "0";
  if (lower.includes("page_size")) return "10";
  if (lower.includes("limit")) return "10";
  if (lower.includes("screen")) return "home";
  if (lower.includes("type")) return "post";
  if (lower.includes("random")) return "0";
  if (lower.includes("seed")) return "123";
  if (lower.includes("isdelete")) return "NO";
  if (lower.includes("is_count")) return "1";
  if (lower.includes("is_collaborate")) return "true";
  if (lower.includes("notification_type")) return "0";
  if (lower.includes("dual_linked_to")) return "2";
  if (lower.includes("dual_linked_name")) return "demotwo";
  if (lower.includes("dual_linked_propic")) return "https://example.com/profile2.jpg";
  if (lower.includes("dual_posted_by")) return "1";
  if (lower.includes("dual_posted_name")) return "demoone";
  if (lower.includes("dual_posted_pic")) return "https://example.com/profile.jpg";
  if (lower.includes("user_pic")) return "https://example.com/profile.jpg";
  if (lower.includes("user_name")) return "demoone";
  if (lower.includes("location")) return "Smoke City";
  if (lower.includes("user_bio")) return "Smoke bio";
  if (lower.includes("user_state")) return "Smoke State";
  if (lower.includes("hide_audience")) return "0";
  if (lower.includes("fileName")) return "smoke.jpg";
  if (lower.includes("profile_pic")) return DEMO_BASE64;
  if (lower.includes("dual_pic")) return DEMO_BASE64;
  if (lower.includes("venture_thumb")) return DEMO_BASE64;
  if (lower.includes("venture_video")) return DEMO_BASE64;
  if (lower.includes("live_thumb")) return DEMO_BASE64;
  if (lower.includes("video_thumb")) return BLOBS.thumb;
  if (lower.includes("video")) return BLOBS.video;
  if (lower.includes("image")) return BLOBS.image;
  if (lower.includes("category_ids")) return "1";
  if (lower.includes("interest_ids")) return "1";
  if (lower.includes("business_ids")) return "1";
  if (lower.includes("card_id")) return "card_smoke";
  if (lower.includes("stripe_customer_id")) return "cus_smoke";
  if (lower.includes("streamname")) return "smoke-stream";
  if (lower.includes("streamtitle")) return "Smoke Stream";
  if (lower.includes("streamcost")) return "0";
  if (lower.includes("venture_title")) return "Smoke Venture";
  if (lower.includes("venture_url")) return "https://example.com";
  if (lower.includes("broadcast_id")) return "1";
  if (lower.includes("comment_by")) return "1";
  if (lower.includes("comment_txt")) return "Smoke comment";
  if (lower.includes("search_txt")) return "demo";
  if (lower.includes("old_password")) return "password123";
  if (lower.includes("new_password")) return "password123";
  if (lower.includes("to_user_id")) return "2";
  if (lower.includes("from_user_id")) return "1";
  if (lower.includes("shared_by")) return "1";
  if (lower.includes("share_with")) return "2";
  if (lower.includes("message_content")) return "Smoke share";
  if (lower.includes("emails")) return "smoke_contact@example.com";
  return "1";
}

function parseResponse(response, rawText) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json") || rawText.trim().startsWith("{") || rawText.trim().startsWith("[")) {
    try {
      const json = JSON.parse(rawText);
      return {
        kind: Array.isArray(json) ? "json-array" : "json-object",
        keys: Array.isArray(json) ? [] : Object.keys(json),
        preview: typeof json === "object" ? JSON.stringify(json).slice(0, 300) : String(json).slice(0, 300)
      };
    } catch {
      // fall through to text
    }
  }

  return {
    kind: contentType || "text",
    keys: [],
    preview: rawText.slice(0, 300)
  };
}

async function postJson(route, body) {
  await fetch(`${DEFAULT_BASE_URL}${route}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body)
  });
}

function summarize(report) {
  const ok = report.tested.filter((entry) => entry.outcome === "ok").length;
  const httpError = report.tested.filter((entry) => entry.outcome === "http_error").length;
  const failed = report.tested.filter((entry) => entry.outcome !== "ok").length;
  return {
    tested: report.tested.length,
    ok,
    httpError,
    failed,
    skipped: report.skipped.length
  };
}
