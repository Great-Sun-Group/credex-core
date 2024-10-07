const jwt = require("jsonwebtoken");
const axiosInstance = require("axios");
const { getConfig } = require("../config/config");

const REPO_OWNER = "Great-Sun-Group";
const REPO_NAME = "credex-core";

async function generateJWT(appId: string, privateKey: string): Promise<string> {
  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
    iss: appId,
  };

  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}

async function getInstallationToken(
  appId: string,
  installationId: string,
  privateKey: string
): Promise<string> {
  const jwtToken = await generateJWT(appId, privateKey);

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

    return response.data.token;
  } catch (error: any) {
    console.error(
      "Error getting installation token:",
      error.response?.data || error.message
    );
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
    const config = await getConfig();

    if (!config.deployment || !config.deployment.github) {
      throw new Error(
        "Deployment configuration is missing. Make sure you have the necessary environment variables set."
      );
    }

    const { appId, installationId, privateKey } = config.deployment.github;

    if (!appId || !installationId || !privateKey) {
      throw new Error(
        "GitHub App credentials are missing. Please check your environment variables."
      );
    }

    const token = await getInstallationToken(appId, installationId, privateKey);
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
