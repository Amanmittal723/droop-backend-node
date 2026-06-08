import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLiveRoutes(router: Router, controllers: ControllerBundle): void {
  router.post("/addLivePost", asyncHandler(controllers.external.addLivePost));
  router.post("/getLiveFeed", asyncHandler(controllers.external.getLiveFeed));
  router.post("/delLive", asyncHandler(controllers.external.deleteLive));
  router.get("/check_wowza", asyncHandler(controllers.external.checkWowza));
  router.get("/create_wowza_stream", asyncHandler(controllers.external.createWowzaStream));
  router.get("/start_stream", asyncHandler(controllers.external.startStream));
  router.get("/stream_state", asyncHandler(controllers.external.streamState));
  router.get("/get_streams", asyncHandler(controllers.external.getStreams));
  router.all("/get_comments", asyncHandler(controllers.legacyComment.getComments));
  router.all("/post_comment", asyncHandler(controllers.legacyComment.postComment));
  router.all("/startstream", asyncHandler(controllers.legacyDiagnostics.startstream));
}
