import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLegacyProfileRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/getUserDetail", asyncHandler(controllers.legacyProfile.getUserDetail));
  router.all("/getUserDetail_5_Jan_2024", asyncHandler(controllers.legacyProfile.getUserDetail5Jan2024));
  router.all("/updateProfile", asyncHandler(controllers.legacyProfile.updateProfile));
  router.all("/updateProfileViewCount", asyncHandler(controllers.legacyProfile.updateProfileViewCountRoute));
}
