import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLegacyFeedRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/addVideoPost.php", asyncHandler(controllers.legacyMedia.addVideoPost));
  router.all("/addVideoPost_12_jun-2021.php", asyncHandler(controllers.legacyMedia.addVideoPostLegacy));
  router.all("/deldualpost.php", asyncHandler(controllers.legacyMedia.delDualPost));
  router.all("/getBrowse.php", asyncHandler(controllers.legacyFeed.getBrowse));
  router.all("/getBrowse2.php", asyncHandler(controllers.legacyFeed.getBrowse2));
  router.all("/getBrowse_20032020.php", asyncHandler(controllers.legacyFeed.getBrowse20032020));
  router.all("/getDuals.php", asyncHandler(controllers.legacyFeed.getDuals));
  router.all("/getDuals1.php", asyncHandler(controllers.legacyFeed.getDuals1));
  router.all("/getDuals2.php", asyncHandler(controllers.legacyFeed.getDuals2));
  router.all("/getDuals3.php", asyncHandler(controllers.legacyFeed.getDuals3));
  router.all("/getDuals4.php", asyncHandler(controllers.legacyFeed.getDuals4));
  router.all("/getDuals4 25 Feb 26.php", asyncHandler(controllers.legacyFeed.getDuals4Legacy));
  router.all("/getLoveDuals.php", asyncHandler(controllers.legacyFeed.getLoveDuals));
  router.all("/getPostByInterest.php", asyncHandler(controllers.legacyFeed.getPostByInterest));
  router.all("/getPostFeed.php", asyncHandler(controllers.legacyFeed.getPostFeed));
  router.all("/getPostFeed2.php", asyncHandler(controllers.legacyFeed.getPostFeed2));
  router.all("/getPostFeed2_5_Jan_2024.php", asyncHandler(controllers.legacyFeed.getPostFeed25Jan2024));
  router.all("/getSaveDuals.php", asyncHandler(controllers.legacyFeed.getSaveDuals));
  router.all("/getSuggestedVideos.php", asyncHandler(controllers.legacyFeed.getSuggestedVideos));
  router.all("/getUserDuals.php", asyncHandler(controllers.legacyFeed.getUserDuals));
  router.all("/getUserDuals2.php", asyncHandler(controllers.legacyFeed.getUserDuals2));
  router.all("/post_dualPost.php", asyncHandler(controllers.legacyMedia.postDualPost));
  router.all("/rejectDual.php", asyncHandler(controllers.legacyMedia.rejectDual));
  router.all("/updateDual.php", asyncHandler(controllers.legacyMedia.updateDual));
  router.all("/updateDual_12_jun_2021.php", asyncHandler(controllers.legacyMedia.updateDualLegacy));
}
