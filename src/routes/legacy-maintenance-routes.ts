import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLegacyMaintenanceRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/delUser", asyncHandler(controllers.legacyMaintenance.delUser));
  router.all("/playvideo", asyncHandler(controllers.legacyDiagnostics.playvideo));
  router.all("/send_notification", asyncHandler(controllers.legacyDiagnostics.sendNotification));
  router.all("/send_notification_dev", asyncHandler(controllers.legacyDiagnostics.sendNotificationDev));
  router.all("/sqlite_users", asyncHandler(controllers.legacyDiagnostics.sqliteUsers));
  router.all("/test", asyncHandler(controllers.legacyDiagnostics.test));
  router.all("/test_curl", asyncHandler(controllers.legacyDiagnostics.testCurl));
  router.all("/test_wowza", asyncHandler(controllers.legacyDiagnostics.testWowza));
  router.all("/testpush", asyncHandler(controllers.legacyDiagnostics.testPush));
}
