import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLiveRoutes(router: Router, controllers: ControllerBundle): void {
  router.post("/addLivePost.php", asyncHandler(controllers.external.addLivePost));
  router.post("/getLiveFeed.php", asyncHandler(controllers.external.getLiveFeed));
  router.post("/delLive.php", asyncHandler(controllers.external.deleteLive));
  router.get("/check_wowza.php", asyncHandler(controllers.external.checkWowza));
  router.get("/create_wowza_stream.php", asyncHandler(controllers.external.createWowzaStream));
  router.get("/start_stream.php", asyncHandler(controllers.external.startStream));
  router.get("/stream_state.php", asyncHandler(controllers.external.streamState));
  router.get("/get_streams.php", asyncHandler(controllers.external.getStreams));
  router.all("/get_comments.php", asyncHandler(controllers.legacyComment.getComments));
  router.all("/post_comment.php", asyncHandler(controllers.legacyComment.postComment));
  router.all("/startstream.php", asyncHandler(controllers.legacyDiagnostics.startstream));
}
