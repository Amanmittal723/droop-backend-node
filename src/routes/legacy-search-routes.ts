import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLegacySearchRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/searchBusiness.php", asyncHandler(controllers.legacySearch.searchBusiness));
  router.all("/searchLive.php", asyncHandler(controllers.legacySearch.searchLive));
  router.all("/searchUser.php", asyncHandler(controllers.legacySearch.searchUser));
  router.all("/searchUser2.php", asyncHandler(controllers.legacySearch.searchUser2));
  router.all("/searchdualpost.php", asyncHandler(controllers.legacySearch.searchDualPost));
}
