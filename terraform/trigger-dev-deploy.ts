import * as crypto from 'crypto';
import axios from 'axios';
const { getConfig } = require("../config/config");

const REPO_OWNER = "Great-Sun-Group";
const REPO_NAME = "credex-core";
const APP_ID = "1018770"; // Hardcoding the App ID as it's a constant

function getPrivateKey(): string {
  const privateKey = process.env.GH_APP_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("GH_APP_PRIVATE_KEY environment variable is not set");
  }
  return privateKey.replace(/\\n/gm, '\n').trim();
}

function logPrivateKeyInfo(privateKey: string): void {
  console.log(`Private key length: ${privateKey.length}`);
  console.log(`First 10 characters: ${privateKey.substring(0, 10)}...`);
  console.log(`Last 10 characters: ...${privateKey.substring(privateKey.length - 10)}`);
  console.log(`Contains "BEGIN": ${privateKey.includes("BEGIN")}`);
  console.log(`Contains "END": ${privateKey.includes("END")}`);
  console.log(`Number of lines: ${privateKey.split('\n').length}`);
}

function generateJWT(privateKey: string): string {
  console.log(`Generating JWT for App ID: ${APP_ID}`);
  logPrivateKeyInfo(privateKey);
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + 600,
    iss: APP_ID
  };

  console.log("Full JWT payload:", JSON.stringify(payload, null, 2));

  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(privateKey, 'base64url');

  const jwt = `${signatureInput}.${signature}`;
  console.log("JWT generated successfully");
  console.log("Full JWT token for debugging:");
  console.log(jwt);
  console.log("Verify this token at: https://jwt.io/");

  return jwt;
}

async function getAppInfo(jwtToken: string): Promise<void> {
  try {
    const response = await axios.get(`https://api.github.com/app`, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "CredEx-App/1.0"
      }
    });
    console.log("GitHub App Information:");
    console.log(`Name: ${response.data.name}`);
    console.log(`ID: ${response.data.id}`);
    console.log(`Description: ${response.data.description}`);
    console.log("Permissions:");
    console.log(JSON.stringify(response.data.permissions, null, 2));
    console.log(`Events: ${response.data.events.join(', ')}`);
    console.log(`Created at: ${response.data.created_at}`);
    console.log(`Updated at: ${response.data.updated_at}`);
  } catch (error: any) {
    console.error("Error fetching GitHub App information:");
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error message:", error.message);
    }
  }
}

async function getInstallationToken(installationId: string, privateKey: string): Promise<string> {
  console.log(`Getting installation token for App ID: ${APP_ID}, Installation ID: ${installationId}`);
  
  const jwtToken = generateJWT(privateKey);
  console.log(`JWT Token (first 20 chars): ${jwtToken.substring(0, 20)}...`);

  // Fetch and log GitHub App information
  await getAppInfo(jwtToken);

  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;
  console.log(`Request URL: ${url}`);

  const headers = {
    Authorization: `Bearer ${jwtToken}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "CredEx-App/1.0"
  };
  console.log("Request headers:", JSON.stringify(headers, null, 2));

  try {
    const response = await axios.post(url, {}, { headers });
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
    throw error;
  }
}

async function triggerDevelopmentWorkflow(token: string): Promise<number> {
  try {
    console.log("Triggering development deployment workflow...");
    const response = await axios.post(
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
          "User-Agent": "CredEx-App/1.0"
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

    const { installationId } = config.deployment.github;
    const privateKey = getPrivateKey();

    console.log("Required GitHub App credentials:");
    console.log(`App ID: ${APP_ID}`);
    console.log(`Installation ID: ${installationId}`);
    console.log(`Private Key: ${privateKey ? "Set" : "Missing"}`);

    if (!installationId || !privateKey) {
      throw new Error(
        "One or more GitHub App credentials are missing. Please check your environment variables."
      );
    }

    const token = await getInstallationToken(installationId, privateKey);
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
