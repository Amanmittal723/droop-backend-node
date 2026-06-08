# Droop Backend Compatibility Architecture

## Goal
- Preserve the PHP-compatible public contract.
- Make the Node/PostgreSQL rewrite easier to hand to other developers.
- Keep route registration, request/response compatibility, controller orchestration, and SQL responsibilities clearly separated.

## Compatibility Rules
- Do not change public endpoint filenames.
- Do not change which endpoints are reachable at both `/foo.php` and `/categories/foo.php`.
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
- Legacy repositories own raw SQL and are grouped by domain under `src/repositories/legacy`.
- Shared helpers live in:
  - `src/lib/legacy-datetime.ts`
  - `src/lib/legacy-media.ts`
  - `src/lib/legacy-sql.ts`

## Endpoint Inventory
- `auth-routes.ts`: `health.php`, `signup.php`, `signup2.php`, `login.php`, `login2.php`, `forgot_pass.php`, `login_test.php`
- `preferences-routes.ts`: `selectUserCategory.php`, `selectUserInterest.php`, `selectUserBusiness.php`
- `social-routes.ts`: `checkblocking.php`, `checkfollowing.php`, `checkmute.php`, `block_user.php`, `mute_user.php`, `follow_user.php`, `save_dual.php`, `love_dual.php`, `wantDual.php`, `shareDual.php`, `shareVenture.php`, `asking_set_price_notification.php`, `getNotifications.php`, `marknotification.php`, `deleteNotifications.php`, `markRead.php`, `clearchat.php`, `change_pass.php`
- `utility-routes.ts`: `reportDual.php`, `reportLive.php`, `reportVenture.php`, `delVenture.php`, `updateVentureCount.php`, `addviewer.php`, `removeViewer.php`, `getTaggedUserDetails.php`, `getDualDet.php`, `getDualPostViews.php`, `viewDualPost.php`, `set_price.php`
- `messaging-routes.ts`: `send_message.php`, `getmessages.php`, `getThread.php`, `getThread_20032020.php`, `getThread2.php`, `getThread2_15112022.php`
- `story-routes.ts`: `addStory.php`, `deleteStory.php`, `getStories.php`
- `stripe-routes.ts`: `stripe_connect.php`, `stripe_redirect_url.php`, `stripe_refresh.php`, `stripe_success.php`, `addStripeCard.php`, `listStripeCard.php`, `deleteStripeCard.php`
- `live-routes.ts`: `addLivePost.php`, `getLiveFeed.php`, `delLive.php`, `check_wowza.php`, `create_wowza_stream.php`, `start_stream.php`, `stream_state.php`, `get_streams.php`, `get_comments.php`, `post_comment.php`, `startstream.php`
- `legacy-follow-routes.ts`: `addContacts.php`, `getFollowers.php`, `getFollowers2.php`, `getFollowing.php`, `getUserSuggession.php`
- `legacy-feed-routes.ts`: `addVideoPost.php`, `addVideoPost_12_jun-2021.php`, `deldualpost.php`, `getBrowse.php`, `getBrowse2.php`, `getBrowse_20032020.php`, `getDuals.php`, `getDuals1.php`, `getDuals2.php`, `getDuals3.php`, `getDuals4.php`, `getDuals4 25 Feb 26.php`, `getLoveDuals.php`, `getPostByInterest.php`, `getPostFeed.php`, `getPostFeed2.php`, `getPostFeed2_5_Jan_2024.php`, `getSaveDuals.php`, `getSuggestedVideos.php`, `getUserDuals.php`, `getUserDuals2.php`, `post_dualPost.php`, `rejectDual.php`, `updateDual.php`, `updateDual_12_jun_2021.php`
- `legacy-profile-routes.ts`: `getUserDetail.php`, `getUserDetail_5_Jan_2024.php`, `updateProfile.php`, `updateProfileViewCount.php`
- `legacy-search-routes.ts`: `searchBusiness.php`, `searchLive.php`, `searchUser.php`, `searchUser2.php`, `searchdualpost.php`
- `legacy-venture-routes.ts`: `getVentureDet.php`, `getVentures.php`, `getuserventure.php`, `postVenture.php`, `uploadVenture.php`, `searchventure.php`
- `legacy-maintenance-routes.ts`: `delUser.php`, `playvideo.php`, `send_notification.php`, `send_notification_dev.php`, `sqlite_users.php`, `test.php`, `test_curl.php`, `test_wowza.php`, `testpush.php`

## Adding A New Legacy Endpoint Safely
1. Add a regression test for the expected request/response shape first.
2. Attach the route in the correct route module.
3. Keep handler logic in the right controller family.
4. Push raw SQL into a legacy repository when adding new DB access.
5. Run `npm test` and `npm run build` before handing off.
