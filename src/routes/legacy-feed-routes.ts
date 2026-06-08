import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLegacyFeedRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/addVideoPost", asyncHandler(controllers.legacyMedia.addVideoPost));
  router.all("/addVideoPost_12_jun-2021", asyncHandler(controllers.legacyMedia.addVideoPostLegacy));
  router.all("/deldualpost", asyncHandler(controllers.legacyMedia.delDualPost));
  router.all("/getBrowse", asyncHandler(controllers.legacyFeed.getBrowse));
  router.all("/getBrowse2", asyncHandler(controllers.legacyFeed.getBrowse2));
  router.all("/getBrowse_20032020", asyncHandler(controllers.legacyFeed.getBrowse20032020));
  router.all("/getDuals", asyncHandler(controllers.legacyFeed.getDuals));
  router.all("/getDuals1", asyncHandler(controllers.legacyFeed.getDuals1));
  router.all("/getDuals2", asyncHandler(controllers.legacyFeed.getDuals2));
  router.all("/getDuals3", asyncHandler(controllers.legacyFeed.getDuals3));
  router.all("/getDuals4", asyncHandler(controllers.legacyFeed.getDuals4));
  router.all("/getDuals4 25 Feb 26", asyncHandler(controllers.legacyFeed.getDuals4Legacy));
  router.all("/getLoveDuals", asyncHandler(controllers.legacyFeed.getLoveDuals));
  router.all("/getPostByInterest", asyncHandler(controllers.legacyFeed.getPostByInterest));
  router.all("/getPostFeed", asyncHandler(controllers.legacyFeed.getPostFeed));
  router.all("/getPostFeed2", asyncHandler(controllers.legacyFeed.getPostFeed2));
  router.all("/getPostFeed2_5_Jan_2024", asyncHandler(controllers.legacyFeed.getPostFeed25Jan2024));
  router.all("/getSaveDuals", asyncHandler(controllers.legacyFeed.getSaveDuals));
  router.all("/getSuggestedVideos", asyncHandler(controllers.legacyFeed.getSuggestedVideos));
  router.all("/getUserDuals", asyncHandler(controllers.legacyFeed.getUserDuals));
  router.all("/getUserDuals2", asyncHandler(controllers.legacyFeed.getUserDuals2));
  router.all("/post_dualPost", asyncHandler(controllers.legacyMedia.postDualPost));
  router.all("/rejectDual", asyncHandler(controllers.legacyMedia.rejectDual));
  router.all("/updateDual", asyncHandler(controllers.legacyMedia.updateDual));
  router.all("/updateDual_12_jun_2021", asyncHandler(controllers.legacyMedia.updateDualLegacy));
}
