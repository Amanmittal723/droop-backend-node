import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerStoryRoutes(router: Router, controllers: ControllerBundle): void {
  router.post("/addStory", asyncHandler(controllers.story.addStory));
  router.post("/deleteStory", asyncHandler(controllers.story.deleteStory));
  router.post("/getStories", asyncHandler(controllers.story.getStories));
  router.post("/viewStory", asyncHandler(controllers.story.viewStory));
}
