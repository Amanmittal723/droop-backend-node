import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLegacyVentureRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/getVentureDet", asyncHandler(controllers.legacyVenture.getVentureDet));
  router.all("/getVentures", asyncHandler(controllers.legacyVenture.getVentures));
  router.all("/getuserventure", asyncHandler(controllers.legacyVenture.getUserVenture));
  router.all("/postVenture", asyncHandler(controllers.legacyVenture.postVenture));
  router.all("/uploadVenture", asyncHandler(controllers.legacyVenture.uploadVenture));
  router.all("/searchventure", asyncHandler(controllers.legacySearch.searchVenture));
}
