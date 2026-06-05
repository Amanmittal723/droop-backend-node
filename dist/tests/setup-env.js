"use strict";
/**
 * Purpose: Set stable environment defaults for Jest integration tests.
 * Expected request body: None.
 * Expected query parameters: None.
 * Expected headers: None.
 * Expected response structure: Environment initialization side effects for tests.
 */
process.env.NODE_ENV = "test";
process.env.PORT = "3001";
