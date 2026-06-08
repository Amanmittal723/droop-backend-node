import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerSocialRoutes(router: Router, controllers: ControllerBundle): void {
  router.post("/checkblocking", asyncHandler(controllers.social.checkBlocking));
  router.post("/checkfollowing", asyncHandler(controllers.social.checkFollowing));
  router.post("/checkmute", asyncHandler(controllers.social.checkMute));
  router.post("/block_user", asyncHandler(controllers.social.blockUser));
  router.post("/mute_user", asyncHandler(controllers.social.muteUser));
  router.post("/follow_user", asyncHandler(controllers.social.followUser));
  router.post("/save_dual", asyncHandler(controllers.social.saveDual));
  router.post("/love_dual", asyncHandler(controllers.social.loveDual));
  router.post("/wantDual", asyncHandler(controllers.social.wantDual));
  router.post("/shareDual", asyncHandler(controllers.social.shareDual));
  router.post("/shareVenture", asyncHandler(controllers.social.shareVenture));
  router.post("/asking_set_price_notification", asyncHandler(controllers.social.askingSetPriceNotification));
  router.post("/getNotifications", asyncHandler(controllers.social.getNotifications));
  router.post("/marknotification", asyncHandler(controllers.social.markNotification));
  router.post("/deleteNotifications", asyncHandler(controllers.social.deleteNotifications));
  router.post("/markRead", asyncHandler(controllers.social.markRead));
  router.post("/clearchat", asyncHandler(controllers.social.clearChat));
  router.post("/change_pass", asyncHandler(controllers.social.changePassword));
}
