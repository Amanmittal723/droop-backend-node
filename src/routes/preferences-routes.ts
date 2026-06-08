import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerPreferencesRoutes(router: Router, controllers: ControllerBundle): void {
  router.post("/selectUserCategory", asyncHandler(controllers.preferences.selectCategories));
  router.post("/selectUserInterest", asyncHandler(controllers.preferences.selectInterests));
  router.post("/selectUserBusiness", asyncHandler(controllers.preferences.selectBusinesses));
}
