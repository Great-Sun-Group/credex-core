import * as fs from 'fs';
import * as path from 'path';
import * as jsonwebtoken from 'jsonwebtoken';
const axiosInstance = require("axios");
const { getConfig } = require("../config/config");

const REPO_OWNER = "Great-Sun-Group";
const REPO_NAME = "credex-core";

function readPrivateKey(): string {
  const keyPath = path.join(__dirname, '..', 'private-key.pem');
  return fs.readFileSync(keyPath, 'utf8');
}

function logPrivateKeyInfo(privateKey: string): void {
  console.log(`Private key length: ${privateKey.length}`);
  console.log(`First 10 characters: ${privateKey.substring(0, 10)}...`);
  console.log(`Last 10 characters: ...${privateKey.substring(privateKey.length - 10)}`);
  console.log(`Contains "BEGIN": ${privateKey.includes("BEGIN")}`);
  console.log(`Contains "END": ${privateKey.includes("END")}`);
  console.log(`Number of lines: ${privateKey.split('\n').length}`);
  console.log("First 3 lines of private key:");
  console.log(privateKey.split('\n').slice(0, 3).join('\n'));
  console.log("Last 3 lines of private key:");
  console.log(privateKey.split('\n').slice(-3).join('\n'));
}

function testPrivateKey(privateKey: string): void {
  try {
    const testPayload = { test: "payload" };
    const token = jsonwebtoken.sign(testPayload, privateKey, { algorithm: "RS256" });
    console.log("Test token generated successfully");
    const decoded = jsonwebtoken.verify(token, privateKey, { algorithms: ["RS256"] });
    console.log("Test token verified successfully");
    console.log("Decoded test payload:", decoded);
  } catch (error) {
    console.error("Error testing private key:", error);
  }
}

function decodeJWT(token: string): void {
  try {
    const decoded = jsonwebtoken.decode(token, { complete: true });
    console.log("Decoded JWT:");
    console.log("Header:", JSON.stringify(decoded?.header, null, 2));
    console.log("Payload:", JSON.stringify(decoded?.payload, null, 2));
  } catch (error) {
    console.error("Error decoding JWT:", error);
  }
}

async function generateJWT(appId: string, privateKey: string): Promise<string> {
  console.log(`Generating JWT for App ID: ${appId}`);
  logPrivateKeyInfo(privateKey);
  
  if (!privateKey.trim()) {
    throw new Error("Private key is empty or contains only whitespace");
  }

  if (!privateKey.includes("BEGIN") || !privateKey.includes("END")) {
    throw new Error("Private key is missing BEGIN or END markers");
  }

  const now = Math.floor(Date.now() / 1000);
  console.log(`Current timestamp: ${now}`);
  const payload = {
    iat: now,
    exp: now + 10 * 60, // 10 minutes expiration
    iss: appId
  };

  console.log("Full JWT payload:", JSON.stringify(payload, null, 2));

  try {
    const token = jsonwebtoken.sign(payload, privateKey, {
      algorithm: "RS256",
      header: {
        alg: "RS256",
        typ: "JWT"
      }
    });
    console.log("JWT generated successfully");
    decodeJWT(token);
    console.log("Full JWT token for debugging:");
    console.log(token);
    console.log("Verify this token at: https://jwt.io/");

    // Verify the token locally
    try {
      const verified = jsonwebtoken.verify(token, privateKey, { algorithms: ["RS256"] });
      console.log("JWT verified locally:", verified);
    } catch (verifyError) {
      console.error("Error verifying JWT locally:", verifyError);
      throw verifyError;
    }

    // Check if the current time is within the token's validity period
    const currentTime = Math.floor(Date.now() / 1000);
    console.log(`Current time: ${currentTime}, Token iat: ${payload.iat}, Token exp: ${payload.exp}`);
    if (currentTime < payload.iat || currentTime > payload.exp) {
      throw new Error("Current time is outside the token's validity period");
    } else {
      console.log("Current time is within the token's validity period");
    }

    return token;
  } catch (error) {
    console.error("Error generating JWT:", error);
    throw error;
  }
}

async function getInstallationToken(
  appId: string,
  installationId: string,
  privateKey: string
): Promise<string> {
  console.log(`Getting installation token for App ID: ${appId}, Installation ID: ${installationId}`);
  
  const jwtToken = await generateJWT(appId, privateKey);
  console.log(`JWT Token (first 20 chars): ${jwtToken.substring(0, 20)}...`);

  try {
    const response = await axiosInstance.post(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {},
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    console.log("Installation token retrieved successfully");
    return response.data.token;
  } catch (error: any) {
    console.error("Error getting installation token:");
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response headers:", JSON.stringify(error.response.headers, null, 2));
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error message:", error.message);
    }
    console.error("Full error object:", JSON.stringify(error, null, 2));
    throw error;
  }
}

async function triggerDevelopmentWorkflow(token: string): Promise<number> {
  try {
    console.log("Triggering development deployment workflow...");
    const response = await axiosInstance.post(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/deploy-development.yml/dispatches`,
      {
        ref: "dev",
        inputs: {
          environment: "development",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    console.log("Development deployment workflow triggered successfully");
    console.log("Response status:", response.status);
    return response.status;
  } catch (error: any) {
    console.error("Error triggering development deployment workflow:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    console.log("Starting deployment process...");
    const config = await getConfig();

    if (!config.deployment || !config.deployment.github) {
      throw new Error(
        "Deployment configuration is missing. Make sure you have the necessary environment variables set."
      );
    }

    const { appId, installationId } = config.deployment.github;
    const privateKey = readPrivateKey();

    console.log("Required GitHub App credentials:");
    console.log(`App ID: ${appId}`);
    console.log(`Installation ID: ${installationId}`);
    console.log(`Private Key: ${privateKey ? "Set" : "Missing"}`);

    if (privateKey) {
      console.log("Private Key Information:");
      logPrivateKeyInfo(privateKey);
    }

    if (!appId || !installationId || !privateKey) {
      throw new Error(
        "One or more GitHub App credentials are missing. Please check your environment variables and private key file."
      );
    }

    console.log("Testing private key...");
    testPrivateKey(privateKey);

    const token = await getInstallationToken(appId, installationId, privateKey);
    console.log(`Installation token retrieved (first 10 chars): ${token.substring(0, 10)}...`);
    
    await triggerDevelopmentWorkflow(token);
    console.log(
      "Deployment workflow triggered. Check GitHub Actions for progress."
    );
  } catch (error: any) {
    console.error("Deployment failed:", error.message);
    process.exit(1);
  }
}

main();
