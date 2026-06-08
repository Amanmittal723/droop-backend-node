# Endpoint Inventory

This file mirrors the compatibility route contract defined in `src/routes/index.ts`.

## Root And `/categories` Aliases
- Every route registered in the compatibility router is mounted at:
  - `/...`
  - `/categories/...`

## Endpoint Families
- Auth: `health.php`, `signup.php`, `signup2.php`, `login.php`, `login2.php`, `forgot_pass.php`, `login_test.php`
- Preferences: `selectUserCategory.php`, `selectUserInterest.php`, `selectUserBusiness.php`
- Social: `checkblocking.php`, `checkfollowing.php`, `checkmute.php`, `block_user.php`, `mute_user.php`, `follow_user.php`, `save_dual.php`, `love_dual.php`, `wantDual.php`, `shareDual.php`, `shareVenture.php`, `asking_set_price_notification.php`, `getNotifications.php`, `marknotification.php`, `deleteNotifications.php`, `markRead.php`, `clearchat.php`, `change_pass.php`
- Utility: `reportDual.php`, `reportLive.php`, `reportVenture.php`, `delVenture.php`, `updateVentureCount.php`, `addviewer.php`, `removeViewer.php`, `getTaggedUserDetails.php`, `getDualDet.php`, `getDualPostViews.php`, `viewDualPost.php`, `set_price.php`
- Messaging: `send_message.php`, `getmessages.php`, `getThread.php`, `getThread_20032020.php`, `getThread2.php`, `getThread2_15112022.php`
- Stories: `addStory.php`, `deleteStory.php`, `getStories.php`
- Stripe: `stripe_connect.php`, `stripe_redirect_url.php`, `stripe_refresh.php`, `stripe_success.php`, `addStripeCard.php`, `listStripeCard.php`, `deleteStripeCard.php`
- Live: `addLivePost.php`, `getLiveFeed.php`, `delLive.php`, `check_wowza.php`, `create_wowza_stream.php`, `start_stream.php`, `stream_state.php`, `get_streams.php`, `get_comments.php`, `post_comment.php`, `startstream.php`
- Legacy follow: `addContacts.php`, `getFollowers.php`, `getFollowers2.php`, `getFollowing.php`, `getUserSuggession.php`
- Legacy feed/media: `addVideoPost.php`, `addVideoPost_12_jun-2021.php`, `deldualpost.php`, `getBrowse.php`, `getBrowse2.php`, `getBrowse_20032020.php`, `getDuals.php`, `getDuals1.php`, `getDuals2.php`, `getDuals3.php`, `getDuals4.php`, `getDuals4 25 Feb 26.php`, `getLoveDuals.php`, `getPostByInterest.php`, `getPostFeed.php`, `getPostFeed2.php`, `getPostFeed2_5_Jan_2024.php`, `getSaveDuals.php`, `getSuggestedVideos.php`, `getUserDuals.php`, `getUserDuals2.php`, `post_dualPost.php`, `rejectDual.php`, `updateDual.php`, `updateDual_12_jun_2021.php`
- Legacy profile: `getUserDetail.php`, `getUserDetail_5_Jan_2024.php`, `updateProfile.php`, `updateProfileViewCount.php`
- Legacy search: `searchBusiness.php`, `searchLive.php`, `searchUser.php`, `searchUser2.php`, `searchdualpost.php`, `searchventure.php`
- Legacy venture: `getVentureDet.php`, `getVentures.php`, `getuserventure.php`, `postVenture.php`, `uploadVenture.php`
- Legacy diagnostics/maintenance: `delUser.php`, `playvideo.php`, `send_notification.php`, `send_notification_dev.php`, `sqlite_users.php`, `test.php`, `test_curl.php`, `test_wowza.php`, `testpush.php`
