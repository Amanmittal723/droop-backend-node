import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerMessagingRoutes(router: Router, controllers: ControllerBundle): void {
  router.post("/send_message", asyncHandler(controllers.messaging.sendMessage));
  router.post("/getmessages", asyncHandler(controllers.messaging.getMessages));
  router.post("/getThread", asyncHandler(controllers.messaging.getThread));
  router.post("/getThread_20032020", asyncHandler(controllers.messaging.getThread20032020));
  router.post("/getThread2", asyncHandler(controllers.messaging.getThread2));
  router.post("/getThread2_15112022", asyncHandler(controllers.messaging.getThread215112022));
}
