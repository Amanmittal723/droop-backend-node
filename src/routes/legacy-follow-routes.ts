import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLegacyFollowRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/addContacts", asyncHandler(controllers.legacyFollow.addContacts));
  router.all("/getFollowers", asyncHandler(controllers.legacyFollow.getFollowers));
  router.all("/getFollowers2", asyncHandler(controllers.legacyFollow.getFollowers2));
  router.all("/getFollowing", asyncHandler(controllers.legacyFollow.getFollowing));
  router.all("/getMutualFriends", asyncHandler(controllers.legacyFollow.getMutualFriends));
  router.all("/getUserSuggession", asyncHandler(controllers.legacyFollow.getUserSuggession));
}
