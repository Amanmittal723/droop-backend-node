/**
 * Purpose: Mount compatibility routes that preserve the original PHP endpoint filenames.
 * Expected request body: Legacy form, JSON, or multipart fields for the migrated endpoints.
 * Expected query parameters: Legacy query keys for the migrated endpoints.
 * Expected headers: Standard HTTP headers and multipart content types where applicable.
 * Expected response structure: Legacy-compatible responses emitted by the mounted controllers.
 */
import { NextFunction, Request, Response, Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { AppDependencies } from "../app";
import { stringifyLegacyValue } from "../lib/legacy-row";
import { AuthController } from "../controllers/auth-controller";
import { HealthController } from "../controllers/health-controller";
import { PreferencesController } from "../controllers/preferences-controller";
import { SocialController } from "../controllers/social-controller";
import { UtilityController } from "../controllers/utility-controller";
import { ExternalController } from "../controllers/external-controller";
import { MessagingController } from "../controllers/messaging-controller";
import { StoryController } from "../controllers/story-controller";
import { LegacyCompatController } from "../controllers/legacy-compat-controller";

export function createCategoriesRouter(dependencies: AppDependencies): Router {
  const router = Router();
  router.use((request: Request, response: Response, next: NextFunction) => {
    const originalJson = response.json.bind(response);
    response.json = ((body: unknown) => originalJson(stringifyLegacyValue(body))) as typeof response.json;
    next();
  });
  const authController = new AuthController(dependencies);
  const healthController = new HealthController({ prismaClient: dependencies.prismaClient });
  const preferencesController = new PreferencesController({ prismaClient: dependencies.prismaClient });
  const socialController = new SocialController({ prismaClient: dependencies.prismaClient });
  const utilityController = new UtilityController({ prismaClient: dependencies.prismaClient });
  const externalController = new ExternalController({
    prismaClient: dependencies.prismaClient,
    stripeService: dependencies.stripeService
  });
  const messagingController = new MessagingController({ prismaClient: dependencies.prismaClient });
  const storyController = new StoryController({ prismaClient: dependencies.prismaClient });
  const legacyController = new LegacyCompatController({
    prismaClient: dependencies.prismaClient,
    stripeService: dependencies.stripeService
  });

  router.get("/health.php", asyncHandler(healthController.index));
  router.post("/signup.php", asyncHandler(authController.signup));
  router.post("/signup2.php", asyncHandler(authController.signup));
  router.post("/login.php", asyncHandler(authController.login));
  router.post("/login2.php", asyncHandler(authController.login));
  router.post("/forgot_pass.php", asyncHandler(authController.forgotPassword));
  router.post("/selectUserCategory.php", asyncHandler(preferencesController.selectCategories));
  router.post("/selectUserInterest.php", asyncHandler(preferencesController.selectInterests));
  router.post("/selectUserBusiness.php", asyncHandler(preferencesController.selectBusinesses));
  router.post("/checkblocking.php", asyncHandler(socialController.checkBlocking));
  router.post("/checkfollowing.php", asyncHandler(socialController.checkFollowing));
  router.post("/checkmute.php", asyncHandler(socialController.checkMute));
  router.post("/block_user.php", asyncHandler(socialController.blockUser));
  router.post("/mute_user.php", asyncHandler(socialController.muteUser));
  router.post("/follow_user.php", asyncHandler(socialController.followUser));
  router.post("/save_dual.php", asyncHandler(socialController.saveDual));
  router.post("/love_dual.php", asyncHandler(socialController.loveDual));
  router.post("/wantDual.php", asyncHandler(socialController.wantDual));
  router.post("/shareDual.php", asyncHandler(socialController.shareDual));
  router.post("/shareVenture.php", asyncHandler(socialController.shareVenture));
  router.post("/asking_set_price_notification.php", asyncHandler(socialController.askingSetPriceNotification));
  router.post("/getNotifications.php", asyncHandler(socialController.getNotifications));
  router.post("/marknotification.php", asyncHandler(socialController.markNotification));
  router.post("/deleteNotifications.php", asyncHandler(socialController.deleteNotifications));
  router.post("/markRead.php", asyncHandler(socialController.markRead));
  router.post("/clearchat.php", asyncHandler(socialController.clearChat));
  router.post("/change_pass.php", asyncHandler(socialController.changePassword));
  router.post("/reportDual.php", asyncHandler(utilityController.reportDual));
  router.post("/reportLive.php", asyncHandler(utilityController.reportLive));
  router.post("/reportVenture.php", asyncHandler(utilityController.reportVenture));
  router.post("/delVenture.php", asyncHandler(utilityController.deleteVenture));
  router.post("/updateVentureCount.php", asyncHandler(utilityController.updateVentureCount));
  router.post("/addviewer.php", asyncHandler(utilityController.addViewer));
  router.post("/removeViewer.php", asyncHandler(utilityController.removeViewer));
  router.post("/getTaggedUserDetails.php", asyncHandler(utilityController.getTaggedUserDetails));
  router.post("/getDualDet.php", asyncHandler(utilityController.getDualDet));
  router.post("/getDualPostViews.php", asyncHandler(utilityController.getDualPostViews));
  router.post("/viewDualPost.php", asyncHandler(utilityController.viewDualPost));
  router.post("/set_price.php", asyncHandler(utilityController.setPrice));
  router.post("/send_message.php", asyncHandler(messagingController.sendMessage));
  router.post("/getmessages.php", asyncHandler(messagingController.getMessages));
  router.post("/getThread.php", asyncHandler(messagingController.getThread));
  router.post("/getThread_20032020.php", asyncHandler(messagingController.getThread20032020));
  router.post("/getThread2.php", asyncHandler(messagingController.getThread2));
  router.post("/getThread2_15112022.php", asyncHandler(messagingController.getThread215112022));
  router.post("/addStory.php", asyncHandler(storyController.addStory));
  router.post("/deleteStory.php", asyncHandler(storyController.deleteStory));
  router.post("/getStories.php", asyncHandler(storyController.getStories));
  router.all("/stripe_connect.php", asyncHandler(externalController.stripeConnect));
  router.all("/stripe_redirect_url.php", asyncHandler(externalController.stripeRedirect));
  router.all("/stripe_refresh.php", asyncHandler(externalController.stripeRefresh));
  router.get("/stripe_success.php", asyncHandler(externalController.stripeSuccess));
  router.post("/addStripeCard.php", asyncHandler(externalController.addStripeCard));
  router.post("/listStripeCard.php", asyncHandler(externalController.listStripeCard));
  router.post("/deleteStripeCard.php", asyncHandler(externalController.deleteStripeCard));
  router.post("/addLivePost.php", asyncHandler(externalController.addLivePost));
  router.post("/getLiveFeed.php", asyncHandler(externalController.getLiveFeed));
  router.post("/delLive.php", asyncHandler(externalController.deleteLive));
  router.get("/check_wowza.php", asyncHandler(externalController.checkWowza));
  router.get("/create_wowza_stream.php", asyncHandler(externalController.createWowzaStream));
  router.get("/start_stream.php", asyncHandler(externalController.startStream));
  router.get("/stream_state.php", asyncHandler(externalController.streamState));
  router.get("/get_streams.php", asyncHandler(externalController.getStreams));

  router.all("/addContacts.php", asyncHandler(legacyController.addContacts));
  router.all("/addVideoPost.php", asyncHandler(legacyController.addVideoPost));
  router.all("/addVideoPost_12_jun-2021.php", asyncHandler(legacyController.addVideoPostLegacy));
  router.all("/delUser.php", asyncHandler(legacyController.delUser));
  router.all("/deldualpost.php", asyncHandler(legacyController.delDualPost));
  router.all("/getBrowse.php", asyncHandler(legacyController.getBrowse));
  router.all("/getBrowse2.php", asyncHandler(legacyController.getBrowse2));
  router.all("/getBrowse_20032020.php", asyncHandler(legacyController.getBrowse20032020));
  router.all("/getDuals.php", asyncHandler(legacyController.getDuals));
  router.all("/getDuals1.php", asyncHandler(legacyController.getDuals1));
  router.all("/getDuals2.php", asyncHandler(legacyController.getDuals2));
  router.all("/getDuals3.php", asyncHandler(legacyController.getDuals3));
  router.all("/getDuals4.php", asyncHandler(legacyController.getDuals4));
  router.all("/getDuals4 25 Feb 26.php", asyncHandler(legacyController.getDuals4Legacy));
  router.all("/getFollowers.php", asyncHandler(legacyController.getFollowers));
  router.all("/getFollowers2.php", asyncHandler(legacyController.getFollowers2));
  router.all("/getFollowing.php", asyncHandler(legacyController.getFollowing));
  router.all("/getLoveDuals.php", asyncHandler(legacyController.getLoveDuals));
  router.all("/getPostByInterest.php", asyncHandler(legacyController.getPostByInterest));
  router.all("/getPostFeed.php", asyncHandler(legacyController.getPostFeed));
  router.all("/getPostFeed2.php", asyncHandler(legacyController.getPostFeed2));
  router.all("/getPostFeed2_5_Jan_2024.php", asyncHandler(legacyController.getPostFeed25Jan2024));
  router.all("/getSaveDuals.php", asyncHandler(legacyController.getSaveDuals));
  router.all("/getSuggestedVideos.php", asyncHandler(legacyController.getSuggestedVideos));
  router.all("/getUserDetail.php", asyncHandler(legacyController.getUserDetail));
  router.all("/getUserDetail_5_Jan_2024.php", asyncHandler(legacyController.getUserDetail5Jan2024));
  router.all("/getUserDuals.php", asyncHandler(legacyController.getUserDuals));
  router.all("/getUserDuals2.php", asyncHandler(legacyController.getUserDuals2));
  router.all("/getUserSuggession.php", asyncHandler(legacyController.getUserSuggession));
  router.all("/getVentureDet.php", asyncHandler(legacyController.getVentureDet));
  router.all("/getVentures.php", asyncHandler(legacyController.getVentures));
  router.all("/get_comments.php", asyncHandler(legacyController.getComments));
  router.all("/getuserventure.php", asyncHandler(legacyController.getUserVenture));
  router.all("/login_test.php", asyncHandler(authController.login));
  router.all("/playvideo.php", asyncHandler(legacyController.playvideo));
  router.all("/postVenture.php", asyncHandler(legacyController.postVenture));
  router.all("/post_comment.php", asyncHandler(legacyController.postComment));
  router.all("/post_dualPost.php", asyncHandler(legacyController.postDualPost));
  router.all("/rejectDual.php", asyncHandler(legacyController.rejectDual));
  router.all("/searchBusiness.php", asyncHandler(legacyController.searchBusiness));
  router.all("/searchLive.php", asyncHandler(legacyController.searchLive));
  router.all("/searchUser.php", asyncHandler(legacyController.searchUser));
  router.all("/searchUser2.php", asyncHandler(legacyController.searchUser2));
  router.all("/searchdualpost.php", asyncHandler(legacyController.searchDualPost));
  router.all("/searchventure.php", asyncHandler(legacyController.searchVenture));
  router.all("/send_notification.php", asyncHandler(legacyController.sendNotification));
  router.all("/send_notification_dev.php", asyncHandler(legacyController.sendNotificationDev));
  router.all("/sqlite_users.php", asyncHandler(legacyController.sqliteUsers));
  router.all("/startstream.php", asyncHandler(legacyController.startstream));
  router.all("/test.php", asyncHandler(legacyController.test));
  router.all("/test_curl.php", asyncHandler(legacyController.testCurl));
  router.all("/test_wowza.php", asyncHandler(legacyController.testWowza));
  router.all("/testpush.php", asyncHandler(legacyController.testPush));
  router.all("/updateDual.php", asyncHandler(legacyController.updateDual));
  router.all("/updateDual_12_jun_2021.php", asyncHandler(legacyController.updateDualLegacy));
  router.all("/updateProfile.php", asyncHandler(legacyController.updateProfile));
  router.all("/updateProfileViewCount.php", asyncHandler(legacyController.updateProfileViewCountRoute));
  router.all("/uploadVenture.php", asyncHandler(legacyController.uploadVenture));

  return router;
}
