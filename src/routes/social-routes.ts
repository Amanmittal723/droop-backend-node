import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerSocialRoutes(router: Router, controllers: ControllerBundle): void {
  router.post("/checkblocking.php", asyncHandler(controllers.social.checkBlocking));
  router.post("/checkfollowing.php", asyncHandler(controllers.social.checkFollowing));
  router.post("/checkmute.php", asyncHandler(controllers.social.checkMute));
  router.post("/block_user.php", asyncHandler(controllers.social.blockUser));
  router.post("/mute_user.php", asyncHandler(controllers.social.muteUser));
  router.post("/follow_user.php", asyncHandler(controllers.social.followUser));
  router.post("/save_dual.php", asyncHandler(controllers.social.saveDual));
  router.post("/love_dual.php", asyncHandler(controllers.social.loveDual));
  router.post("/wantDual.php", asyncHandler(controllers.social.wantDual));
  router.post("/shareDual.php", asyncHandler(controllers.social.shareDual));
  router.post("/shareVenture.php", asyncHandler(controllers.social.shareVenture));
  router.post("/asking_set_price_notification.php", asyncHandler(controllers.social.askingSetPriceNotification));
  router.post("/getNotifications.php", asyncHandler(controllers.social.getNotifications));
  router.post("/marknotification.php", asyncHandler(controllers.social.markNotification));
  router.post("/deleteNotifications.php", asyncHandler(controllers.social.deleteNotifications));
  router.post("/markRead.php", asyncHandler(controllers.social.markRead));
  router.post("/clearchat.php", asyncHandler(controllers.social.clearChat));
  router.post("/change_pass.php", asyncHandler(controllers.social.changePassword));
}
