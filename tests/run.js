const { execSync } = require('child_process');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);

// Check for environment argument
let env = 'local';
let command = args[0];
let remainingArgs = args.slice(1);

// Handle environment selection
if (command === 'dev' || command === 'stage') {
  env = command;
  command = remainingArgs[0];
  remainingArgs = remainingArgs.slice(1);
}

// Special commands that map to devadmin operations
const devAdminCommands = ['cleardevdbs', 'forcedco', 'clearforce'];

// Tests that don't require JWT
const noJwtTests = ['onboardmember', 'login'];

// Add environment-specific flags
const envFlags = {
  local: '',
  dev: '--runInBand',
  stage: '--runInBand'
};

// Build and execute the Jest command
async function runTest() {
  try {
    let jestCommand;
    let testParams = remainingArgs;

    if (command === 'basic') {
      // Handle basic integration tests
      jestCommand = `jest --testPathPattern=tests/api/basic ${envFlags[env]}`;
    } else if (devAdminCommands.includes(command?.toLowerCase())) {
      // Handle devadmin operations
      const testPath = path.join('tests', 'api', 'endpoints', 'devadmin', `${command.toLowerCase()}.test.ts`);
      jestCommand = `jest "${testPath}" ${envFlags[env]}`;
    } else if (command === 'admin') {
      // Handle admin tests
      jestCommand = `jest --testPathPattern=tests/api/endpoints/admin/admin\\.test\\.ts ${envFlags[env]}`;
    } else if (command?.toLowerCase().startsWith('admin/')) {
      // Handle individual admin operation tests
      const operation = command.split('/')[1];
      jestCommand = `jest --testPathPattern=tests/api/endpoints/admin/${operation}\\.test\\.ts ${envFlags[env]}`;
    } else {
      // Handle endpoint tests
      const pattern = `tests/api/endpoints/${command.toLowerCase()}\\.test\\.ts`;

      // If not a no-JWT test and we have args, handle login
      if (!noJwtTests.includes(command.toLowerCase()) && remainingArgs.length > 0) {
        const phone = remainingArgs[0];
        // Run login test to get JWT
        const loginOutput = execSync(
          `jest tests/api/endpoints/login.test.ts --testNamePattern=login ${envFlags[env]}`,
          {
            env: {
              ...process.env,
              NODE_ENV: env,
              TEST_PARAMS: phone,
              API_ENV: env
            },
            encoding: 'utf8'
          }
        );

        // Extract JWT from login response
        const tokenMatch = loginOutput.match(/token: '([^']+)'/);
        if (tokenMatch) {
          const jwt = tokenMatch[1];
          // Use JWT and all remaining args except phone
          testParams = [jwt, ...remainingArgs.slice(1)];
        } else {
          console.error('Failed to extract JWT from login response');
          process.exit(1);
        }
      }

      jestCommand = `jest --testPathPattern="${pattern}" ${envFlags[env]}`;
    }

    // Execute the Jest command
    execSync(jestCommand, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: env,
        TEST_PARAMS: testParams.join(' '),
        API_ENV: env
      }
    });
  } catch (error) {
    process.exit(1);
  }
}

runTest();
