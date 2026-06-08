import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerMessagingRoutes(router: Router, controllers: ControllerBundle): void {
  router.post("/send_message.php", asyncHandler(controllers.messaging.sendMessage));
  router.post("/getmessages.php", asyncHandler(controllers.messaging.getMessages));
  router.post("/getThread.php", asyncHandler(controllers.messaging.getThread));
  router.post("/getThread_20032020.php", asyncHandler(controllers.messaging.getThread20032020));
  router.post("/getThread2.php", asyncHandler(controllers.messaging.getThread2));
  router.post("/getThread2_15112022.php", asyncHandler(controllers.messaging.getThread215112022));
}
