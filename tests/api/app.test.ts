/**
 * App Test Entry Point
 * 
 * This file serves as an entry point for running App tests with the command:
 * npm test app
 * 
 * It imports and re-exports all App tests.
 */

// Import App tests
import './App/appVersion.test';
import './App/appVersionAdmin.test';

// This file doesn't need to export anything, as the tests are registered when imported
