import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerPreferencesRoutes(router: Router, controllers: ControllerBundle): void {
  router.post("/selectUserCategory.php", asyncHandler(controllers.preferences.selectCategories));
  router.post("/selectUserInterest.php", asyncHandler(controllers.preferences.selectInterests));
  router.post("/selectUserBusiness.php", asyncHandler(controllers.preferences.selectBusinesses));
}
