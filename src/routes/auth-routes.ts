import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerAuthRoutes(router: Router, controllers: ControllerBundle): void {
  router.get("/health", asyncHandler(controllers.health.index));
  router.post("/signup", asyncHandler(controllers.auth.signup));
  router.post("/signup2", asyncHandler(controllers.auth.signup));
  router.post("/login", asyncHandler(controllers.auth.login));
  router.post("/login2", asyncHandler(controllers.auth.login));
  router.post("/forgot_pass", asyncHandler(controllers.auth.forgotPassword));
  router.all("/login_test", asyncHandler(controllers.auth.login));
}
