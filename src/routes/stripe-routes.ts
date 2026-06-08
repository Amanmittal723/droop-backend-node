import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerStripeRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/stripe_connect", asyncHandler(controllers.external.stripeConnect));
  router.all("/stripe_redirect_url", asyncHandler(controllers.external.stripeRedirect));
  router.all("/stripe_refresh", asyncHandler(controllers.external.stripeRefresh));
  router.get("/stripe_success", asyncHandler(controllers.external.stripeSuccess));
  router.post("/addStripeCard", asyncHandler(controllers.external.addStripeCard));
  router.post("/listStripeCard", asyncHandler(controllers.external.listStripeCard));
  router.post("/deleteStripeCard", asyncHandler(controllers.external.deleteStripeCard));
}
