/**
 * Purpose: Assemble legacy compatibility route modules behind a single router.
 * Expected request body: Legacy PHP-style form, JSON, or multipart fields for the migrated endpoints.
 * Expected query parameters: Legacy query keys for the migrated endpoints.
 * Expected headers: Standard HTTP headers and multipart content types where applicable.
 * Expected response structure: Legacy-compatible responses emitted by the mounted controllers.
 */
import { NextFunction, Request, Response, Router } from "express";
import { AppDependencies } from "../app";
import { createControllerBundle } from "../controllers/create-controller-bundle";
import { stringifyLegacyValue } from "../lib/legacy-row";
import { registerAuthRoutes } from "./auth-routes";
import { registerLegacyFeedRoutes } from "./legacy-feed-routes";
import { registerLegacyFollowRoutes } from "./legacy-follow-routes";
import { registerLegacyMaintenanceRoutes } from "./legacy-maintenance-routes";
import { registerLegacyProfileRoutes } from "./legacy-profile-routes";
import { registerLegacySearchRoutes } from "./legacy-search-routes";
import { registerLegacyVentureRoutes } from "./legacy-venture-routes";
import { registerLiveRoutes } from "./live-routes";
import { registerMessagingRoutes } from "./messaging-routes";
import { registerPreferencesRoutes } from "./preferences-routes";
import { registerSocialRoutes } from "./social-routes";
import { registerStoryRoutes } from "./story-routes";
import { registerStripeRoutes } from "./stripe-routes";
import { registerUtilityRoutes } from "./utility-routes";

export function createCompatibilityRouter(dependencies: AppDependencies): Router {
  const router = Router();
  router.use((request: Request, response: Response, next: NextFunction) => {
    const originalJson = response.json.bind(response);
    response.json = ((body: unknown) => originalJson(stringifyLegacyValue(body))) as typeof response.json;
    next();
  });

  const controllers = createControllerBundle(dependencies);
  registerAuthRoutes(router, controllers);
  registerPreferencesRoutes(router, controllers);
  registerSocialRoutes(router, controllers);
  registerUtilityRoutes(router, controllers);
  registerMessagingRoutes(router, controllers);
  registerStoryRoutes(router, controllers);
  registerStripeRoutes(router, controllers);
  registerLiveRoutes(router, controllers);
  registerLegacyFollowRoutes(router, controllers);
  registerLegacyFeedRoutes(router, controllers);
  registerLegacyProfileRoutes(router, controllers);
  registerLegacySearchRoutes(router, controllers);
  registerLegacyVentureRoutes(router, controllers);
  registerLegacyMaintenanceRoutes(router, controllers);

  return router;
}
