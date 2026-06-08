import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLegacySearchRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/searchBusiness", asyncHandler(controllers.legacySearch.searchBusiness));
  router.all("/searchLive", asyncHandler(controllers.legacySearch.searchLive));
  router.all("/searchUser", asyncHandler(controllers.legacySearch.searchUser));
  router.all("/searchUser2", asyncHandler(controllers.legacySearch.searchUser2));
  router.all("/searchdualpost", asyncHandler(controllers.legacySearch.searchDualPost));
}
