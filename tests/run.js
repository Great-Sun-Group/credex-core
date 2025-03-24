const { execSync } = require("child_process");
const path = require("path");

// Force Docker environment to use existing container
process.env.DOCKER_ENV = "true";
// Reduce verbosity
process.env.MINIMAL_LOGS = "true";
// Set log level to none to disable server logs
process.env.LOG_LEVEL = "none";
// Disable logger
process.env.DISABLE_LOGGER = "true";
// Disable Winston logger
process.env.WINSTON_SILENT = "true";
// Disable console output from the server
process.env.SILENT = "true";




// Parse command line arguments handling quoted strings
function parseArgs(args) {
  // Join all arguments with spaces
  const argsString = args.join(' ');
  const result = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  // Process character by character
  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];
    
    // Handle quotes
    if ((char === '"' || char === "'") && (i === 0 || argsString[i-1] === ' ')) {
      inQuotes = true;
      quoteChar = char;
      continue;
    }
    
    // Handle end of quotes
    if (inQuotes && char === quoteChar && (i === argsString.length - 1 || argsString[i+1] === ' ')) {
      inQuotes = false;
      result.push(current);
      current = '';
      continue;
    }
    
    // Handle spaces outside quotes
    if (char === ' ' && !inQuotes) {
      if (current) {
        result.push(current);
        current = '';
      }
      continue;
    }
    
    // Add character to current argument
    current += char;
  }
  
  // Add the last argument if there is one
  if (current) {
    result.push(current);
  }
  
  return result;
}

// Get command line arguments
const args = process.argv.slice(2);

// Check for environment argument
let env = "local";
let command = args[0];
let remainingArgs = parseArgs(args.slice(1));

// Handle environment selection
if (command === "dev" || command === "stage") {
  env = command;
  command = remainingArgs[0];
  remainingArgs = remainingArgs.slice(1);
}

// Special commands that map to devadmin operations
const devAdminCommands = [
  "cleardevdbs",
  "forcedco",
  "clearforce",
  "trustaudit",
];

// Special commands that map to integration tests
const integrationCommands = ["integrate"];

// Tests that don't require JWT
const noJwtTests = ["onboardmember", "login", "marketFlow"];

// Add environment-specific flags
const envFlags = {
  local: "",
  dev: "--runInBand",
  stage: "--runInBand",
};

// Build and execute the Jest command
async function runTest() {
  try {
    // Minimal logging
    if (!process.env.MINIMAL_LOGS) {
      console.log("Using existing Docker container started with npm run docker:dev");
    }

    // Force Docker environment to ensure we connect to the existing container
    process.env.DOCKER_ENV = "true";

    // Set baseURL to Docker container - use localhost since we're running tests from outside Docker
    process.env.TEST_BASE_URL = "http://localhost:3000";

    let jestCommand;
    let testParams = remainingArgs;

    // Handle devadmin commands first
    if (devAdminCommands.includes(command)) {
      const pattern = `tests/api/devadmin/${command.toLowerCase()}\\.test\\.ts`;
      execSync(`jest --testPathPattern="${pattern}" ${envFlags[env]}`, {
        stdio: "inherit",
        env: {
          ...process.env,
          NODE_ENV: env,
          API_ENV: env,
        },
      });
      return;
    }

    // Handle integration tests
    if (integrationCommands.includes(command)) {
      const pattern = "tests/integration/index.test.ts";
      execSync(`jest ${pattern} ${envFlags[env]}`, {
        stdio: "inherit",
        env: {
          ...process.env,
          NODE_ENV: env,
          API_ENV: env,
        },
      });
      return;
    }

    if (command === "errors" || command === "error-cases") {
      console.log("Setting up test accounts for error cases...");

      // Create first test account with unique timestamp
      const timestamp1 = Date.now();
      const account1Output = execSync(
        `jest tests/api/onboardmember.test.ts --testNamePattern="onboard member" ${envFlags[env]}`,
        {
          env: {
            ...process.env,
            NODE_ENV: env,
            TEST_PARAMS: `John Doe ${timestamp1}0 USD`,
            API_ENV: env,
          },
          encoding: "utf8",
        }
      );

      // Add delay to ensure unique timestamp
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create second test account with unique timestamp
      const timestamp2 = Date.now();
      const account2Output = execSync(
        `jest tests/api/onboardmember.test.ts --testNamePattern="onboard member" ${envFlags[env]}`,
        {
          env: {
            ...process.env,
            NODE_ENV: env,
            TEST_PARAMS: `Jane Smith ${timestamp2}1 USD`,
            API_ENV: env,
          },
          encoding: "utf8",
        }
      );

      // Extract tokens and account IDs
      const token1Match = account1Output.match(/"token":\s*"([^"]+)"/);
      const token2Match = account2Output.match(/"token":\s*"([^"]+)"/);
      const accountId1Match = account1Output.match(/"id":\s*"([^"]+)"/);
      const accountId2Match = account2Output.match(/"id":\s*"([^"]+)"/);

      if (
        !token1Match ||
        !token2Match ||
        !accountId1Match ||
        !accountId2Match
      ) {
        console.error("Failed to extract test credentials");
        process.exit(1);
      }

      // Set up test parameters for error cases
      testParams = [
        token1Match[1], // First token
        accountId1Match[1], // First account ID
        accountId2Match[1], // Second account ID
        token2Match[1], // Second token (for tests requiring different user)
      ];

      console.log("Test setup complete. Using parameters:", {
        token1: token1Match[1].substring(0, 10) + "...",
        accountId1: accountId1Match[1],
        accountId2: accountId2Match[1],
        token2: token2Match[1].substring(0, 10) + "...",
      });

      // Run error test files with test parameters
      jestCommand = `jest tests/api/error-cases --testMatch="**/*.errors.ts" ${envFlags[env]}`;
    } else if (command) {
      // Handle endpoint tests
      const pattern = `tests/api/${command.toLowerCase()}\\.test\\.ts`;

      // If not a no-JWT test and we have args, handle login
      if (
        !noJwtTests.includes(command.toLowerCase()) &&
        remainingArgs.length > 0
      ) {
        // Check if the first argument looks like a JWT token (has two dots and starts with "ey")
        const firstArg = remainingArgs[0];
        const isJwtToken =
          firstArg.startsWith("ey") && firstArg.split(".").length === 3;

        if (isJwtToken) {
          // If it's already a JWT token, use it directly
          console.log("Using provided JWT token");
          testParams = remainingArgs;
        } else {
          // Otherwise, treat it as a phone number and run login
          const phone = firstArg;
          console.log(`Running login for phone: ${phone}`);
          // Run login test to get JWT
          const loginOutput = execSync(
            `jest tests/api/login.test.ts --testNamePattern=login ${envFlags[env]}`,
            {
              env: {
                ...process.env,
                NODE_ENV: env,
                TEST_PARAMS: phone,
                API_ENV: env,
              },
              encoding: "utf8",
            }
          );

          // Extract JWT from login response
          const tokenMatch = loginOutput.match(/"token":\s*"([^"]+)"/);
          if (tokenMatch) {
            const jwt = tokenMatch[1];
            // Use JWT and all remaining args except phone
            testParams = [jwt, ...remainingArgs.slice(1)];
          } else {
            console.error("Failed to extract JWT from login response");
            process.exit(1);
          }
        }
      }

      jestCommand = `jest --testPathPattern="${pattern}" ${envFlags[env]}`;
    } else {
      // No command provided or running coverage - run all tests
      const isCoverage = process.env.COVERAGE === "true";
      jestCommand = `jest ${envFlags[env]} ${isCoverage ? "--coverage" : ""}`;
    }

    // Execute the Jest command with default reporter to see console output
    // Remove --silent flag to see console.log output
    execSync(`${jestCommand} --no-coverage`, {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: env,
        TEST_PARAMS: testParams
          .map((param) => (param.includes(" ") ? `'${param}'` : param))
          .join(" "),
        API_ENV: env,
        SILENT_REPORTER_SHOW_WARNINGS: "false",
        SILENT_REPORTER_SHOW_ERRORS: "true",
      },
    });
  } catch (error) {
    process.exit(1);
  } finally {
    // Minimal logging
    if (!process.env.MINIMAL_LOGS) {
      console.log("Test completed - using existing Docker container, no cleanup needed");
    }
  }
}

runTest();
