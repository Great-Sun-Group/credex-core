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

// Build the Jest command
let jestCommand;

// Add environment-specific flags
const envFlags = {
  local: '',
  dev: '--runInBand',
  stage: '--runInBand'
};

if (command === 'basic') {
  // Handle basic integration tests
  jestCommand = `jest --testPathPattern=tests/api/basic ${envFlags[env]}`;
} else if (devAdminCommands.includes(command?.toLowerCase())) {
  // Handle devadmin operations - use the devadmin directory
  const testPath = path.join('tests', 'api', 'endpoints', 'devadmin', `${command.toLowerCase()}.test.ts`);
  jestCommand = `jest "${testPath}" ${envFlags[env]}`;
} else {
  // Handle endpoint tests - use case-insensitive pattern matching
  const pattern = `tests/api/endpoints/.*${command.toLowerCase()}.*\\.test\\.ts`;
  jestCommand = `jest --testPathPattern="${pattern}" ${envFlags[env]}`;
}

try {
  // Execute the Jest command with environment variables
  execSync(jestCommand, { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: env,
      TEST_PARAMS: remainingArgs.join(' '),
      API_ENV: env
    }
  });
} catch (error) {
  process.exit(1);
}
