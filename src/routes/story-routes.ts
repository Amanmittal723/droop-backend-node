import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerStoryRoutes(router: Router, controllers: ControllerBundle): void {
  router.post("/addStory.php", asyncHandler(controllers.story.addStory));
  router.post("/deleteStory.php", asyncHandler(controllers.story.deleteStory));
  router.post("/getStories.php", asyncHandler(controllers.story.getStories));
}
