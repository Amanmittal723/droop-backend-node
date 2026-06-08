import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLegacyFollowRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/addContacts.php", asyncHandler(controllers.legacyFollow.addContacts));
  router.all("/getFollowers.php", asyncHandler(controllers.legacyFollow.getFollowers));
  router.all("/getFollowers2.php", asyncHandler(controllers.legacyFollow.getFollowers2));
  router.all("/getFollowing.php", asyncHandler(controllers.legacyFollow.getFollowing));
  router.all("/getUserSuggession.php", asyncHandler(controllers.legacyFollow.getUserSuggession));
}
