const { execSync, spawn } = require("child_process");
const net = require('net');
const path = require("path");

// Get command line arguments
const args = process.argv.slice(2);

// Check for environment argument
let env = "local";
let command = args[0];
let remainingArgs = args.slice(1);

// Handle environment selection
if (command === "dev" || command === "stage") {
  env = command;
  command = remainingArgs[0];
  remainingArgs = remainingArgs.slice(1);
}

// Special commands that map to devadmin operations
const devAdminCommands = ["cleardevdbs", "forcedco", "clearforce"];

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
    client.connect(3000, '127.0.0.1', () => {
      client.destroy();
      resolve(true);
    }).on('error', () => {
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
    env: { ...process.env, NODE_ENV: "test" },
    stdio: "inherit"
  });

  // Give the server time to start
  return new Promise((resolve) => {
    setTimeout(() => resolve(server), 5000);
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

    if (command) {
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
      // No command provided - run all tests
      jestCommand = `jest ${envFlags[env]}`;
    }

    // Execute the Jest command
    execSync(jestCommand, {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: env,
        TEST_PARAMS: testParams.join(" "),
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
