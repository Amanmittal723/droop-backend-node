import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerAuthRoutes(router: Router, controllers: ControllerBundle): void {
  router.get("/health.php", asyncHandler(controllers.health.index));
  router.post("/signup.php", asyncHandler(controllers.auth.signup));
  router.post("/signup2.php", asyncHandler(controllers.auth.signup));
  router.post("/login.php", asyncHandler(controllers.auth.login));
  router.post("/login2.php", asyncHandler(controllers.auth.login));
  router.post("/forgot_pass.php", asyncHandler(controllers.auth.forgotPassword));
  router.all("/login_test.php", asyncHandler(controllers.auth.login));
}
