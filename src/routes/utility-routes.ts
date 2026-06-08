import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerUtilityRoutes(router: Router, controllers: ControllerBundle): void {
  router.post("/reportDual", asyncHandler(controllers.utility.reportDual));
  router.post("/reportLive", asyncHandler(controllers.utility.reportLive));
  router.post("/reportVenture", asyncHandler(controllers.utility.reportVenture));
  router.post("/delVenture", asyncHandler(controllers.utility.deleteVenture));
  router.post("/updateVentureCount", asyncHandler(controllers.utility.updateVentureCount));
  router.post("/addviewer", asyncHandler(controllers.utility.addViewer));
  router.post("/removeViewer", asyncHandler(controllers.utility.removeViewer));
  router.post("/getTaggedUserDetails", asyncHandler(controllers.utility.getTaggedUserDetails));
  router.post("/getDualDet", asyncHandler(controllers.utility.getDualDet));
  router.post("/getDualPostViews", asyncHandler(controllers.utility.getDualPostViews));
  router.post("/viewDualPost", asyncHandler(controllers.utility.viewDualPost));
  router.post("/set_price", asyncHandler(controllers.utility.setPrice));
}
