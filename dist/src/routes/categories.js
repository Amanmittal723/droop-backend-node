"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCategoriesRouter = createCategoriesRouter;
/**
 * Purpose: Mount compatibility routes that preserve the original PHP endpoint filenames.
 * Expected request body: Legacy form, JSON, or multipart fields for the migrated endpoints.
 * Expected query parameters: Legacy query keys for the migrated endpoints.
 * Expected headers: Standard HTTP headers and multipart content types where applicable.
 * Expected response structure: Legacy-compatible responses emitted by the mounted controllers.
 */
const express_1 = require("express");
const async_handler_1 = require("../lib/async-handler");
const legacy_row_1 = require("../lib/legacy-row");
const auth_controller_1 = require("../controllers/auth-controller");
const health_controller_1 = require("../controllers/health-controller");
const preferences_controller_1 = require("../controllers/preferences-controller");
const social_controller_1 = require("../controllers/social-controller");
const utility_controller_1 = require("../controllers/utility-controller");
const external_controller_1 = require("../controllers/external-controller");
const messaging_controller_1 = require("../controllers/messaging-controller");
const story_controller_1 = require("../controllers/story-controller");
const legacy_compat_controller_1 = require("../controllers/legacy-compat-controller");
function createCategoriesRouter(dependencies) {
    const router = (0, express_1.Router)();
    router.use((request, response, next) => {
        const originalJson = response.json.bind(response);
        response.json = ((body) => originalJson((0, legacy_row_1.stringifyLegacyValue)(body)));
        next();
    });
    const authController = new auth_controller_1.AuthController(dependencies);
    const healthController = new health_controller_1.HealthController({ prismaClient: dependencies.prismaClient });
    const preferencesController = new preferences_controller_1.PreferencesController({ prismaClient: dependencies.prismaClient });
    const socialController = new social_controller_1.SocialController({ prismaClient: dependencies.prismaClient });
    const utilityController = new utility_controller_1.UtilityController({ prismaClient: dependencies.prismaClient });
    const externalController = new external_controller_1.ExternalController({
        prismaClient: dependencies.prismaClient,
        stripeService: dependencies.stripeService
    });
    const messagingController = new messaging_controller_1.MessagingController({ prismaClient: dependencies.prismaClient });
    const storyController = new story_controller_1.StoryController({ prismaClient: dependencies.prismaClient });
    const legacyController = new legacy_compat_controller_1.LegacyCompatController({
        prismaClient: dependencies.prismaClient,
        stripeService: dependencies.stripeService
    });
    router.get("/health.php", (0, async_handler_1.asyncHandler)(healthController.index));
    router.post("/signup.php", (0, async_handler_1.asyncHandler)(authController.signup));
    router.post("/signup2.php", (0, async_handler_1.asyncHandler)(authController.signup));
    router.post("/login.php", (0, async_handler_1.asyncHandler)(authController.login));
    router.post("/login2.php", (0, async_handler_1.asyncHandler)(authController.login));
    router.post("/forgot_pass.php", (0, async_handler_1.asyncHandler)(authController.forgotPassword));
    router.post("/selectUserCategory.php", (0, async_handler_1.asyncHandler)(preferencesController.selectCategories));
    router.post("/selectUserInterest.php", (0, async_handler_1.asyncHandler)(preferencesController.selectInterests));
    router.post("/selectUserBusiness.php", (0, async_handler_1.asyncHandler)(preferencesController.selectBusinesses));
    router.post("/checkblocking.php", (0, async_handler_1.asyncHandler)(socialController.checkBlocking));
    router.post("/checkfollowing.php", (0, async_handler_1.asyncHandler)(socialController.checkFollowing));
    router.post("/checkmute.php", (0, async_handler_1.asyncHandler)(socialController.checkMute));
    router.post("/block_user.php", (0, async_handler_1.asyncHandler)(socialController.blockUser));
    router.post("/mute_user.php", (0, async_handler_1.asyncHandler)(socialController.muteUser));
    router.post("/follow_user.php", (0, async_handler_1.asyncHandler)(socialController.followUser));
    router.post("/save_dual.php", (0, async_handler_1.asyncHandler)(socialController.saveDual));
    router.post("/love_dual.php", (0, async_handler_1.asyncHandler)(socialController.loveDual));
    router.post("/wantDual.php", (0, async_handler_1.asyncHandler)(socialController.wantDual));
    router.post("/shareDual.php", (0, async_handler_1.asyncHandler)(socialController.shareDual));
    router.post("/shareVenture.php", (0, async_handler_1.asyncHandler)(socialController.shareVenture));
    router.post("/asking_set_price_notification.php", (0, async_handler_1.asyncHandler)(socialController.askingSetPriceNotification));
    router.post("/getNotifications.php", (0, async_handler_1.asyncHandler)(socialController.getNotifications));
    router.post("/marknotification.php", (0, async_handler_1.asyncHandler)(socialController.markNotification));
    router.post("/deleteNotifications.php", (0, async_handler_1.asyncHandler)(socialController.deleteNotifications));
    router.post("/markRead.php", (0, async_handler_1.asyncHandler)(socialController.markRead));
    router.post("/clearchat.php", (0, async_handler_1.asyncHandler)(socialController.clearChat));
    router.post("/change_pass.php", (0, async_handler_1.asyncHandler)(socialController.changePassword));
    router.post("/reportDual.php", (0, async_handler_1.asyncHandler)(utilityController.reportDual));
    router.post("/reportLive.php", (0, async_handler_1.asyncHandler)(utilityController.reportLive));
    router.post("/reportVenture.php", (0, async_handler_1.asyncHandler)(utilityController.reportVenture));
    router.post("/delVenture.php", (0, async_handler_1.asyncHandler)(utilityController.deleteVenture));
    router.post("/updateVentureCount.php", (0, async_handler_1.asyncHandler)(utilityController.updateVentureCount));
    router.post("/addviewer.php", (0, async_handler_1.asyncHandler)(utilityController.addViewer));
    router.post("/removeViewer.php", (0, async_handler_1.asyncHandler)(utilityController.removeViewer));
    router.post("/getTaggedUserDetails.php", (0, async_handler_1.asyncHandler)(utilityController.getTaggedUserDetails));
    router.post("/getDualDet.php", (0, async_handler_1.asyncHandler)(utilityController.getDualDet));
    router.post("/getDualPostViews.php", (0, async_handler_1.asyncHandler)(utilityController.getDualPostViews));
    router.post("/viewDualPost.php", (0, async_handler_1.asyncHandler)(utilityController.viewDualPost));
    router.post("/set_price.php", (0, async_handler_1.asyncHandler)(utilityController.setPrice));
    router.post("/send_message.php", (0, async_handler_1.asyncHandler)(messagingController.sendMessage));
    router.post("/getmessages.php", (0, async_handler_1.asyncHandler)(messagingController.getMessages));
    router.post("/getThread.php", (0, async_handler_1.asyncHandler)(messagingController.getThread));
    router.post("/getThread_20032020.php", (0, async_handler_1.asyncHandler)(messagingController.getThread20032020));
    router.post("/getThread2.php", (0, async_handler_1.asyncHandler)(messagingController.getThread2));
    router.post("/getThread2_15112022.php", (0, async_handler_1.asyncHandler)(messagingController.getThread215112022));
    router.post("/addStory.php", (0, async_handler_1.asyncHandler)(storyController.addStory));
    router.post("/deleteStory.php", (0, async_handler_1.asyncHandler)(storyController.deleteStory));
    router.post("/getStories.php", (0, async_handler_1.asyncHandler)(storyController.getStories));
    router.all("/stripe_connect.php", (0, async_handler_1.asyncHandler)(externalController.stripeConnect));
    router.all("/stripe_redirect_url.php", (0, async_handler_1.asyncHandler)(externalController.stripeRedirect));
    router.all("/stripe_refresh.php", (0, async_handler_1.asyncHandler)(externalController.stripeRefresh));
    router.get("/stripe_success.php", (0, async_handler_1.asyncHandler)(externalController.stripeSuccess));
    router.post("/addStripeCard.php", (0, async_handler_1.asyncHandler)(externalController.addStripeCard));
    router.post("/listStripeCard.php", (0, async_handler_1.asyncHandler)(externalController.listStripeCard));
    router.post("/deleteStripeCard.php", (0, async_handler_1.asyncHandler)(externalController.deleteStripeCard));
    router.post("/addLivePost.php", (0, async_handler_1.asyncHandler)(externalController.addLivePost));
    router.post("/getLiveFeed.php", (0, async_handler_1.asyncHandler)(externalController.getLiveFeed));
    router.post("/delLive.php", (0, async_handler_1.asyncHandler)(externalController.deleteLive));
    router.get("/check_wowza.php", (0, async_handler_1.asyncHandler)(externalController.checkWowza));
    router.get("/create_wowza_stream.php", (0, async_handler_1.asyncHandler)(externalController.createWowzaStream));
    router.get("/start_stream.php", (0, async_handler_1.asyncHandler)(externalController.startStream));
    router.get("/stream_state.php", (0, async_handler_1.asyncHandler)(externalController.streamState));
    router.get("/get_streams.php", (0, async_handler_1.asyncHandler)(externalController.getStreams));
    router.all("/addContacts.php", (0, async_handler_1.asyncHandler)(legacyController.addContacts));
    router.all("/addVideoPost.php", (0, async_handler_1.asyncHandler)(legacyController.addVideoPost));
    router.all("/addVideoPost_12_jun-2021.php", (0, async_handler_1.asyncHandler)(legacyController.addVideoPostLegacy));
    router.all("/delUser.php", (0, async_handler_1.asyncHandler)(legacyController.delUser));
    router.all("/deldualpost.php", (0, async_handler_1.asyncHandler)(legacyController.delDualPost));
    router.all("/getBrowse.php", (0, async_handler_1.asyncHandler)(legacyController.getBrowse));
    router.all("/getBrowse2.php", (0, async_handler_1.asyncHandler)(legacyController.getBrowse2));
    router.all("/getBrowse_20032020.php", (0, async_handler_1.asyncHandler)(legacyController.getBrowse20032020));
    router.all("/getDuals.php", (0, async_handler_1.asyncHandler)(legacyController.getDuals));
    router.all("/getDuals1.php", (0, async_handler_1.asyncHandler)(legacyController.getDuals1));
    router.all("/getDuals2.php", (0, async_handler_1.asyncHandler)(legacyController.getDuals2));
    router.all("/getDuals3.php", (0, async_handler_1.asyncHandler)(legacyController.getDuals3));
    router.all("/getDuals4.php", (0, async_handler_1.asyncHandler)(legacyController.getDuals4));
    router.all("/getDuals4 25 Feb 26.php", (0, async_handler_1.asyncHandler)(legacyController.getDuals4Legacy));
    router.all("/getFollowers.php", (0, async_handler_1.asyncHandler)(legacyController.getFollowers));
    router.all("/getFollowers2.php", (0, async_handler_1.asyncHandler)(legacyController.getFollowers2));
    router.all("/getFollowing.php", (0, async_handler_1.asyncHandler)(legacyController.getFollowing));
    router.all("/getLoveDuals.php", (0, async_handler_1.asyncHandler)(legacyController.getLoveDuals));
    router.all("/getPostByInterest.php", (0, async_handler_1.asyncHandler)(legacyController.getPostByInterest));
    router.all("/getPostFeed.php", (0, async_handler_1.asyncHandler)(legacyController.getPostFeed));
    router.all("/getPostFeed2.php", (0, async_handler_1.asyncHandler)(legacyController.getPostFeed2));
    router.all("/getPostFeed2_5_Jan_2024.php", (0, async_handler_1.asyncHandler)(legacyController.getPostFeed25Jan2024));
    router.all("/getSaveDuals.php", (0, async_handler_1.asyncHandler)(legacyController.getSaveDuals));
    router.all("/getSuggestedVideos.php", (0, async_handler_1.asyncHandler)(legacyController.getSuggestedVideos));
    router.all("/getUserDetail.php", (0, async_handler_1.asyncHandler)(legacyController.getUserDetail));
    router.all("/getUserDetail_5_Jan_2024.php", (0, async_handler_1.asyncHandler)(legacyController.getUserDetail5Jan2024));
    router.all("/getUserDuals.php", (0, async_handler_1.asyncHandler)(legacyController.getUserDuals));
    router.all("/getUserDuals2.php", (0, async_handler_1.asyncHandler)(legacyController.getUserDuals2));
    router.all("/getUserSuggession.php", (0, async_handler_1.asyncHandler)(legacyController.getUserSuggession));
    router.all("/getVentureDet.php", (0, async_handler_1.asyncHandler)(legacyController.getVentureDet));
    router.all("/getVentures.php", (0, async_handler_1.asyncHandler)(legacyController.getVentures));
    router.all("/get_comments.php", (0, async_handler_1.asyncHandler)(legacyController.getComments));
    router.all("/getuserventure.php", (0, async_handler_1.asyncHandler)(legacyController.getUserVenture));
    router.all("/login_test.php", (0, async_handler_1.asyncHandler)(authController.login));
    router.all("/playvideo.php", (0, async_handler_1.asyncHandler)(legacyController.playvideo));
    router.all("/postVenture.php", (0, async_handler_1.asyncHandler)(legacyController.postVenture));
    router.all("/post_comment.php", (0, async_handler_1.asyncHandler)(legacyController.postComment));
    router.all("/post_dualPost.php", (0, async_handler_1.asyncHandler)(legacyController.postDualPost));
    router.all("/rejectDual.php", (0, async_handler_1.asyncHandler)(legacyController.rejectDual));
    router.all("/searchBusiness.php", (0, async_handler_1.asyncHandler)(legacyController.searchBusiness));
    router.all("/searchLive.php", (0, async_handler_1.asyncHandler)(legacyController.searchLive));
    router.all("/searchUser.php", (0, async_handler_1.asyncHandler)(legacyController.searchUser));
    router.all("/searchUser2.php", (0, async_handler_1.asyncHandler)(legacyController.searchUser2));
    router.all("/searchdualpost.php", (0, async_handler_1.asyncHandler)(legacyController.searchDualPost));
    router.all("/searchventure.php", (0, async_handler_1.asyncHandler)(legacyController.searchVenture));
    router.all("/send_notification.php", (0, async_handler_1.asyncHandler)(legacyController.sendNotification));
    router.all("/send_notification_dev.php", (0, async_handler_1.asyncHandler)(legacyController.sendNotificationDev));
    router.all("/sqlite_users.php", (0, async_handler_1.asyncHandler)(legacyController.sqliteUsers));
    router.all("/startstream.php", (0, async_handler_1.asyncHandler)(legacyController.startstream));
    router.all("/test.php", (0, async_handler_1.asyncHandler)(legacyController.test));
    router.all("/test_curl.php", (0, async_handler_1.asyncHandler)(legacyController.testCurl));
    router.all("/test_wowza.php", (0, async_handler_1.asyncHandler)(legacyController.testWowza));
    router.all("/testpush.php", (0, async_handler_1.asyncHandler)(legacyController.testPush));
    router.all("/updateDual.php", (0, async_handler_1.asyncHandler)(legacyController.updateDual));
    router.all("/updateDual_12_jun_2021.php", (0, async_handler_1.asyncHandler)(legacyController.updateDualLegacy));
    router.all("/updateProfile.php", (0, async_handler_1.asyncHandler)(legacyController.updateProfile));
    router.all("/updateProfileViewCount.php", (0, async_handler_1.asyncHandler)(legacyController.updateProfileViewCountRoute));
    router.all("/uploadVenture.php", (0, async_handler_1.asyncHandler)(legacyController.uploadVenture));
    return router;
}
