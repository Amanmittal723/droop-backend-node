import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLegacyVentureRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/getVentureDet.php", asyncHandler(controllers.legacyVenture.getVentureDet));
  router.all("/getVentures.php", asyncHandler(controllers.legacyVenture.getVentures));
  router.all("/getuserventure.php", asyncHandler(controllers.legacyVenture.getUserVenture));
  router.all("/postVenture.php", asyncHandler(controllers.legacyVenture.postVenture));
  router.all("/uploadVenture.php", asyncHandler(controllers.legacyVenture.uploadVenture));
  router.all("/searchventure.php", asyncHandler(controllers.legacySearch.searchVenture));
}
