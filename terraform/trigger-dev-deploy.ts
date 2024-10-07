const jwt = require("jsonwebtoken");
const axiosInstance = require("axios");
const { getConfig } = require("../config/config");

const REPO_OWNER = "Great-Sun-Group";
const REPO_NAME = "credex-core";

function logPrivateKeyInfo(privateKey: string): void {
  console.log(`Private key length: ${privateKey.length}`);
  console.log(`First 10 characters: ${privateKey.substring(0, 10)}...`);
  console.log(`Last 10 characters: ...${privateKey.substring(privateKey.length - 10)}`);
  console.log(`Contains "BEGIN": ${privateKey.includes("BEGIN")}`);
  console.log(`Contains "END": ${privateKey.includes("END")}`);
  console.log(`Number of lines: ${privateKey.split('\n').length}`);
}

function testPrivateKey(privateKey: string): void {
  try {
    const testPayload = { test: "payload" };
    const token = jwt.sign(testPayload, privateKey, { algorithm: "RS256" });
    console.log("Test token generated successfully");
    const decoded = jwt.verify(token, privateKey, { algorithms: ["RS256"] });
    console.log("Test token verified successfully");
    console.log("Decoded test payload:", decoded);
  } catch (error) {
    console.error("Error testing private key:", error);
  }
}

function decodeJWT(token: string): void {
  try {
    const decoded = jwt.decode(token, { complete: true });
    console.log("Decoded JWT:");
    console.log("Header:", JSON.stringify(decoded.header, null, 2));
    console.log("Payload:", JSON.stringify(decoded.payload, null, 2));
  } catch (error) {
    console.error("Error decoding JWT:", error);
  }
}

async function generateJWT(clientId: string, appId: string, privateKey: string): Promise<string> {
  console.log(`Generating JWT for Client ID: ${clientId}, App ID: ${appId}`);
  logPrivateKeyInfo(privateKey);
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + 10 * 60, // 10 minutes expiration
    iss: appId,
  };

  try {
    const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });
    console.log("JWT generated successfully");
    decodeJWT(token);
    return token;
  } catch (error) {
    console.error("Error generating JWT:", error);
    throw error;
  }
}

async function getInstallationToken(
  clientId: string,
  appId: string,
  installationId: string,
  privateKey: string
): Promise<string> {
  console.log(`Getting installation token for Client ID: ${clientId}, App ID: ${appId}, Installation ID: ${installationId}`);
  
  const jwtToken = await generateJWT(clientId, appId, privateKey);
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
    console.error(
      "Error getting installation token:",
      error.response?.data || error.message
    );
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    }
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

    const { clientId, appId, installationId, privateKey } = config.deployment.github;

    console.log("Required GitHub App credentials:");
    console.log(`Client ID: ${clientId ? "Set" : "Missing"}`);
    console.log(`App ID: ${appId ? "Set" : "Missing"}`);
    console.log(`Installation ID: ${installationId ? "Set" : "Missing"}`);
    console.log(`Private Key: ${privateKey ? "Set" : "Missing"}`);

    if (privateKey) {
      console.log("Private Key Information:");
      logPrivateKeyInfo(privateKey);
    }

    if (!clientId || !appId || !installationId || !privateKey) {
      throw new Error(
        "One or more GitHub App credentials are missing. Please check your environment variables."
      );
    }

    console.log("Testing private key...");
    testPrivateKey(privateKey);

    const token = await getInstallationToken(clientId, appId, installationId, privateKey);
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
