# Droop Backend Compatibility Architecture

## Goal
- Preserve the PHP-compatible public contract.
- Make the Node/PostgreSQL rewrite easier to hand to other developers.
- Keep route registration, request/response compatibility, controller orchestration, and SQL responsibilities clearly separated.

## Compatibility Rules
- Do not change public endpoint filenames.
- Do not change which endpoints are reachable at both `/foo` and `/categories/foo`.
- Do not change `legacyRequestMiddleware` request merging semantics.
- Do not normalize legacy response payloads into modern shapes.
- Do not change legacy stringification rules for booleans, numerics, and dates unless tests are updated to prove parity.

## Route Structure
- `src/routes/index.ts` is the central compatibility router.
- Each route file only maps endpoints to handlers.
- Route modules are grouped in an easyworks-style layout:
  - `auth-routes.ts`
  - `preferences-routes.ts`
  - `social-routes.ts`
  - `messaging-routes.ts`
  - `story-routes.ts`
  - `stripe-routes.ts`
  - `live-routes.ts`
  - `legacy-feed-routes.ts`
  - `legacy-profile-routes.ts`
  - `legacy-follow-routes.ts`
  - `legacy-search-routes.ts`
  - `legacy-venture-routes.ts`
  - `legacy-maintenance-routes.ts`
  - `utility-routes.ts`

## Controller And Repository Boundaries
- Controllers own request parsing, orchestration, and legacy response shaping.
- Legacy repositories own raw SQL and are grouped by domain under `src/repositories`.
- Shared helpers live in:
  - `src/lib/legacy-datetime.ts`
  - `src/lib/legacy-media.ts`
  - `src/lib/legacy-sql.ts`

## Endpoint Inventory
- `auth-routes.ts`: `health`, `signup`, `signup2`, `login`, `login2`, `forgot_pass`, `login_test`
- `preferences-routes.ts`: `selectUserCategory`, `selectUserInterest`, `selectUserBusiness`
- `social-routes.ts`: `checkblocking`, `checkfollowing`, `checkmute`, `block_user`, `mute_user`, `follow_user`, `save_dual`, `love_dual`, `wantDual`, `shareDual`, `shareVenture`, `asking_set_price_notification`, `getNotifications`, `marknotification`, `deleteNotifications`, `markRead`, `clearchat`, `change_pass`
- `utility-routes.ts`: `reportDual`, `reportLive`, `reportVenture`, `delVenture`, `updateVentureCount`, `addviewer`, `removeViewer`, `getTaggedUserDetails`, `getDualDet`, `getDualPostViews`, `viewDualPost`, `set_price`
- `messaging-routes.ts`: `send_message`, `getmessages`, `getThread`, `getThread_20032020`, `getThread2`, `getThread2_15112022`
- `story-routes.ts`: `addStory`, `deleteStory`, `getStories`
- `stripe-routes.ts`: `stripe_connect`, `stripe_redirect_url`, `stripe_refresh`, `stripe_success`, `addStripeCard`, `listStripeCard`, `deleteStripeCard`
- `live-routes.ts`: `addLivePost`, `getLiveFeed`, `delLive`, `check_wowza`, `create_wowza_stream`, `start_stream`, `stream_state`, `get_streams`, `get_comments`, `post_comment`, `startstream`
- `legacy-follow-routes.ts`: `addContacts`, `getFollowers`, `getFollowers2`, `getFollowing`, `getUserSuggession`
- `legacy-feed-routes.ts`: `addVideoPost`, `addVideoPost_12_jun-2021`, `deldualpost`, `getBrowse`, `getBrowse2`, `getBrowse_20032020`, `getDuals`, `getDuals1`, `getDuals2`, `getDuals3`, `getDuals4`, `getDuals4 25 Feb 26`, `getLoveDuals`, `getPostByInterest`, `getPostFeed`, `getPostFeed2`, `getPostFeed2_5_Jan_2024`, `getSaveDuals`, `getSuggestedVideos`, `getUserDuals`, `getUserDuals2`, `post_dualPost`, `rejectDual`, `updateDual`, `updateDual_12_jun_2021`
- `legacy-profile-routes.ts`: `getUserDetail`, `getUserDetail_5_Jan_2024`, `updateProfile`, `updateProfileViewCount`
- `legacy-search-routes.ts`: `searchBusiness`, `searchLive`, `searchUser`, `searchUser2`, `searchdualpost`
- `legacy-venture-routes.ts`: `getVentureDet`, `getVentures`, `getuserventure`, `postVenture`, `uploadVenture`, `searchventure`
- `legacy-maintenance-routes.ts`: `delUser`, `playvideo`, `send_notification`, `send_notification_dev`, `sqlite_users`, `test`, `test_curl`, `test_wowza`, `testpush`

## Adding A New Legacy Endpoint Safely
1. Add a regression test for the expected request/response shape first.
2. Attach the route in the correct route module.
3. Keep handler logic in the right controller family.
4. Push raw SQL into a legacy repository when adding new DB access.
5. Run `npm test` and `npm run build` before handing off.
