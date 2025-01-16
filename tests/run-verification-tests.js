#!/usr/bin/env node
const { execSync } = require('child_process');

// Ensure line endings are correct for Windows
process.env.FORCE_COLOR = '1';

// Test suites organized into smaller batches with memory impact ratings
const testSuites = [
  // Light memory impact tests first
  {
    name: 'Utils/Helper Tests',
    pattern: '"tests/api/verification/utils/"',
    memoryLimit: '256MB',
    delay: 2000
  },
  {
    name: 'Service Layer Tests',
    pattern: '"tests/api/verification/services/"',
    memoryLimit: '384MB',
    delay: 2000
  },
  // Medium memory impact tests
  {
    name: 'Security Tests',
    pattern: '"tests/api/verification/security.test.ts"',
    memoryLimit: '512MB',
    delay: 3000
  },
  {
    name: 'Security Directory Tests',
    pattern: '"tests/api/verification/security/"',
    memoryLimit: '512MB',
    delay: 3000
  },
  // Heavy memory impact tests last
  {
    name: 'Upload Tests',
    pattern: '"tests/api/verification/upload.test.ts"',
    memoryLimit: '512MB',
    delay: 5000
  },
  {
    name: 'Upload Controller Tests',
    pattern: '"tests/api/verification/controllers/uploadController.test.ts"',
    memoryLimit: '512MB',
    delay: 5000
  },
  {
    name: 'Integration Tests',
    pattern: '"tests/api/verification/integration/"',
    memoryLimit: '512MB',
    delay: 5000
  },
  {
    name: 'Performance Tests',
    pattern: '"tests/api/verification/performance/"',
    memoryLimit: '512MB',
    delay: 5000
  }
];

// Run tests sequentially with resource management
async function runTests() {
  console.log('Starting verification tests with optimized resource management...\n');
  
  for (const suite of testSuites) {
    console.log(`\nPreparing to run ${suite.name}...`);
    try {
      // Add delay between test suites to allow system resources to stabilize
      if (testSuites.indexOf(suite) > 0) {
        console.log(`Waiting ${suite.delay}ms for system resources to stabilize...`);
        await new Promise(resolve => setTimeout(resolve, suite.delay));
      }

      // Run each test suite with optimized settings and dynamic memory limits
      console.log(`Running with memory limit: ${suite.memoryLimit}`);
      const command = `npx jest --config="${process.cwd()}/jest.config.js" ${suite.pattern} --no-coverage --maxWorkers=25% --workerIdleMemoryLimit=${suite.memoryLimit} --detectOpenHandles`;
      
      execSync(command, { stdio: 'inherit' });
      console.log(`✓ ${suite.name} completed successfully`);

      // Force garbage collection between suites if available
      if (global.gc) {
        console.log('Running garbage collection...');
        global.gc();
      }
    } catch (error) {
      console.error(`✗ ${suite.name} failed:`, error.message);
      process.exit(1);
    }
  }
}

// Run with --expose-gc flag
if (!global.gc) {
  console.log('For optimal performance, run with: node --expose-gc tests/run-verification-tests.js');
}

// Handle Windows-specific cleanup
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down...');
  process.exit(0);
});

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
