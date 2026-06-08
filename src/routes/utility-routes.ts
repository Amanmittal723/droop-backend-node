import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerUtilityRoutes(router: Router, controllers: ControllerBundle): void {
  router.post("/reportDual.php", asyncHandler(controllers.utility.reportDual));
  router.post("/reportLive.php", asyncHandler(controllers.utility.reportLive));
  router.post("/reportVenture.php", asyncHandler(controllers.utility.reportVenture));
  router.post("/delVenture.php", asyncHandler(controllers.utility.deleteVenture));
  router.post("/updateVentureCount.php", asyncHandler(controllers.utility.updateVentureCount));
  router.post("/addviewer.php", asyncHandler(controllers.utility.addViewer));
  router.post("/removeViewer.php", asyncHandler(controllers.utility.removeViewer));
  router.post("/getTaggedUserDetails.php", asyncHandler(controllers.utility.getTaggedUserDetails));
  router.post("/getDualDet.php", asyncHandler(controllers.utility.getDualDet));
  router.post("/getDualPostViews.php", asyncHandler(controllers.utility.getDualPostViews));
  router.post("/viewDualPost.php", asyncHandler(controllers.utility.viewDualPost));
  router.post("/set_price.php", asyncHandler(controllers.utility.setPrice));
}
