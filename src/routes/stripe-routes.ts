import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerStripeRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/stripe_connect.php", asyncHandler(controllers.external.stripeConnect));
  router.all("/stripe_redirect_url.php", asyncHandler(controllers.external.stripeRedirect));
  router.all("/stripe_refresh.php", asyncHandler(controllers.external.stripeRefresh));
  router.get("/stripe_success.php", asyncHandler(controllers.external.stripeSuccess));
  router.post("/addStripeCard.php", asyncHandler(controllers.external.addStripeCard));
  router.post("/listStripeCard.php", asyncHandler(controllers.external.listStripeCard));
  router.post("/deleteStripeCard.php", asyncHandler(controllers.external.deleteStripeCard));
}
