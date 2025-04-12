/**
 * App Test Entry Point
 * 
 * This file serves as an entry point for running App tests with the command:
 * npm test app
 * 
 * It imports and re-exports all App tests.
 */

// Import App tests - Admin tests first, then regular tests
import './App/appVersionAdmin.test';
import './App/appVersion.test';

// This file doesn't need to export anything, as the tests are registered when imported
