/**
 * Purpose: Set stable environment defaults for Jest integration tests.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Environment initialization side effects for tests.
 */
process.env.NODE_ENV = "test";
process.env.PORT = "3001";
process.env.LEGACY_STORAGE_ROOT = "/private/tmp/droop-backend-test-storage";
process.env.LEGACY_THUMBNAILS_ROOT = "/private/tmp/droop-backend-test-runtime/thumbnails";
process.env.LEGACY_VIDEO_POSTS_ROOT = "/private/tmp/droop-backend-test-runtime/videoPosts";
process.env.LEGACY_PHP_ROOT = "/private/tmp/droop-backend-test-legacy-php";
process.env.SWAGGER_ENABLED = "false";
