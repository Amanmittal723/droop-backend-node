import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { ControllerBundle } from "../controllers/create-controller-bundle";

export function registerLegacyMaintenanceRoutes(router: Router, controllers: ControllerBundle): void {
  router.all("/delUser.php", asyncHandler(controllers.legacyMaintenance.delUser));
  router.all("/playvideo.php", asyncHandler(controllers.legacyDiagnostics.playvideo));
  router.all("/send_notification.php", asyncHandler(controllers.legacyDiagnostics.sendNotification));
  router.all("/send_notification_dev.php", asyncHandler(controllers.legacyDiagnostics.sendNotificationDev));
  router.all("/sqlite_users.php", asyncHandler(controllers.legacyDiagnostics.sqliteUsers));
  router.all("/test.php", asyncHandler(controllers.legacyDiagnostics.test));
  router.all("/test_curl.php", asyncHandler(controllers.legacyDiagnostics.testCurl));
  router.all("/test_wowza.php", asyncHandler(controllers.legacyDiagnostics.testWowza));
  router.all("/testpush.php", asyncHandler(controllers.legacyDiagnostics.testPush));
}
