/**
 * Purpose: Instantiate the compatibility controller bundle used by split route modules.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Controller instances wired with shared application dependencies.
 */
import { AppDependencies } from "../app";
import { AuthController } from "./auth-controller";
import { ExternalController } from "./external-controller";
import { HealthController } from "./health-controller";
import { LegacyCommentController } from "./legacy/comment-controller";
import { LegacyDiagnosticsController } from "./legacy/diagnostics-controller";
import { LegacyFeedController } from "./legacy/feed-controller";
import { LegacyFollowController } from "./legacy/follow-controller";
import { LegacyMaintenanceController } from "./legacy/maintenance-controller";
import { LegacyMediaController } from "./legacy/media-controller";
import { LegacyProfileController } from "./legacy/profile-controller";
import { LegacySearchController } from "./legacy/search-controller";
import { LegacyVentureController } from "./legacy/venture-controller";
import { MessagingController } from "./messaging-controller";
import { PreferencesController } from "./preferences-controller";
import { SocialController } from "./social-controller";
import { StoryController } from "./story-controller";
import { UtilityController } from "./utility-controller";

export type ControllerBundle = ReturnType<typeof createControllerBundle>;

export function createControllerBundle(dependencies: AppDependencies) {
  return {
    auth: new AuthController(dependencies),
    health: new HealthController({ prismaClient: dependencies.prismaClient }),
    preferences: new PreferencesController({ prismaClient: dependencies.prismaClient }),
    social: new SocialController({ prismaClient: dependencies.prismaClient }),
    utility: new UtilityController({ prismaClient: dependencies.prismaClient }),
    external: new ExternalController({
      prismaClient: dependencies.prismaClient,
      stripeService: dependencies.stripeService
    }),
    messaging: new MessagingController({ prismaClient: dependencies.prismaClient }),
    story: new StoryController({ prismaClient: dependencies.prismaClient }),
    legacyFollow: new LegacyFollowController({
      prismaClient: dependencies.prismaClient,
      stripeService: dependencies.stripeService
    }),
    legacyProfile: new LegacyProfileController({
      prismaClient: dependencies.prismaClient,
      stripeService: dependencies.stripeService
    }),
    legacySearch: new LegacySearchController({
      prismaClient: dependencies.prismaClient,
      stripeService: dependencies.stripeService
    }),
    legacyVenture: new LegacyVentureController({
      prismaClient: dependencies.prismaClient,
      stripeService: dependencies.stripeService
    }),
    legacyComment: new LegacyCommentController({
      prismaClient: dependencies.prismaClient,
      stripeService: dependencies.stripeService
    }),
    legacyFeed: new LegacyFeedController({
      prismaClient: dependencies.prismaClient,
      stripeService: dependencies.stripeService
    }),
    legacyMedia: new LegacyMediaController({
      prismaClient: dependencies.prismaClient,
      stripeService: dependencies.stripeService
    }),
    legacyMaintenance: new LegacyMaintenanceController({
      prismaClient: dependencies.prismaClient,
      stripeService: dependencies.stripeService
    }),
    legacyDiagnostics: new LegacyDiagnosticsController({
      prismaClient: dependencies.prismaClient,
      stripeService: dependencies.stripeService
    })
  };
}
