const { execSync, spawn } = require("child_process");
const net = require("net");
const path = require("path");

// Parse command line arguments handling quoted strings
function parseArgs(args) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    // Check if argument starts with a quote
    if (!inQuotes && (arg.startsWith('"') || arg.startsWith("'"))) {
      inQuotes = true;
      quoteChar = arg[0];
      current = arg.slice(1);
    }
    // Check if argument ends with the same quote
    else if (inQuotes && arg.endsWith(quoteChar)) {
      current += ' ' + arg.slice(0, -1);
      result.push(current);
      current = '';
      inQuotes = false;
    }
    // If we're in quotes, add the argument with a space
    else if (inQuotes) {
      current += ' ' + arg;
    }
    // Not in quotes, treat as normal argument
    else {
      result.push(arg);
    }
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
const devAdminCommands = ["cleardevdbs", "forcedco", "clearforce", "trustaudit"];

// Special commands that map to integration tests
const integrationCommands = ["integrate"];

// Tests that don't require JWT
const noJwtTests = ["onboardmember", "login"];

// Add environment-specific flags
const envFlags = {
  local: "",
  dev: "--runInBand",
  stage: "--runInBand",
};

// Check if server is running on port 3000
function isServerRunning() {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client
      .connect(3000, "127.0.0.1", () => {
        client.destroy();
        resolve(true);
      })
      .on("error", () => {
        resolve(false);
      });
  });
}

// Start server and return the process
function startServer() {
  console.log("Building TypeScript...");
  execSync("npm run build", { stdio: "inherit" });

  console.log("Starting test server...");
  const server = spawn("node", ["build/src/index.js"], {
    env: { 
      ...process.env, 
      NODE_ENV: "test",
      CLIENT_API_KEY: process.env.CLIENT_API_KEY || 'love-achingly'
    },
    stdio: "inherit",
  });

  // Give the server time to start and initialize
  return new Promise((resolve) => {
    setTimeout(() => resolve(server), 8000);
  });
}

// Build and execute the Jest command
async function runTest() {
  let serverStarted = false;
  let server;
  try {
    // Only start server if one isn't running
    if (!(await isServerRunning())) {
      server = await startServer();
      serverStarted = true;
    } else {
      console.log("Using existing server...");
    }
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
        const phone = remainingArgs[0];
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

      jestCommand = `jest --testPathPattern="${pattern}" ${envFlags[env]}`;
    } else {
    // No command provided or running coverage - run all tests
    const isCoverage = process.env.COVERAGE === 'true';
    jestCommand = `jest ${envFlags[env]} ${isCoverage ? '--coverage' : ''}`;
    }

    // Execute the Jest command
    execSync(jestCommand, {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: env,
        TEST_PARAMS: testParams.map(param => 
          param.includes(" ") ? `'${param}'` : param
        ).join(" "),
        API_ENV: env,
      },
    });
  } catch (error) {
    process.exit(1);
  } finally {
    // Only kill server if we started it
    if (serverStarted && server) {
      console.log("Shutting down test server...");
      server.kill();
    }
  }
}

runTest();
