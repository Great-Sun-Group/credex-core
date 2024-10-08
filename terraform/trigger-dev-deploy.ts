import * as crypto from 'crypto';
import axios from 'axios';
import * as zlib from 'zlib';
import { promisify } from 'util';
import AdmZip from 'adm-zip';
const { getConfig } = require("../config/config");

const gunzip = promisify(zlib.gunzip);

const REPO_OWNER = "Great-Sun-Group";
const REPO_NAME = "credex-core";
const WORKFLOW_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SCRIPT_TIMEOUT = 35 * 60 * 1000; // 35 minutes

function getEnvVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

function checkRequiredEnvVariables() {
  ['GH_APP_PRIVATE_KEY', 'GH_APP_ID'].forEach(getEnvVariable);
}

function getPrivateKey(): string {
  const privateKey = getEnvVariable('GH_APP_PRIVATE_KEY');
  return privateKey.replace(/\\n/gm, '\n').trim();
}

function generateJWT(privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const appId = getEnvVariable('GH_APP_ID');
  const payload = {
    iat: now,
    exp: now + 600,
    iss: appId
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(privateKey, 'base64url');

  return `${signatureInput}.${signature}`;
}

async function getInstallationToken(installationId: string, privateKey: string): Promise<string> {
  const jwtToken = generateJWT(privateKey);
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;

  const headers = {
    Authorization: `Bearer ${jwtToken}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "CredEx-App/1.0"
  };

  try {
    const response = await axios.post(url, {}, { headers });
    return response.data.token;
  } catch (error: any) {
    console.error("Error getting installation token:", error.message);
    throw error;
  }
}

async function triggerDevelopmentWorkflow(token: string): Promise<number> {
  console.log("Triggering development workflow...");
  try {
    await axios.post(
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

    const runsResponse = await axios.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "CredEx-App/1.0"
        },
      }
    );

    const runId = runsResponse.data.workflow_runs[0].id;
    return runId;
  } catch (error: any) {
    console.error("Error triggering development deployment workflow:", error.message);
    throw error;
  }
}

async function getWorkflowRunLogs(token: string, runId: number): Promise<string> {
  console.log(`Fetching logs for run ID: ${runId}...`);
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}/logs`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "CredEx-App/1.0"
  };

  try {
    const response = await axios.get(url, { headers, responseType: 'arraybuffer' });
    
    const contentType = response.headers['content-type'];
    let decompressed: Buffer;

    if (contentType === 'application/zip') {
      const zip = new AdmZip(response.data);
      const zipEntries = zip.getEntries();
      let allLogs = '';
      for (const entry of zipEntries) {
        allLogs += zip.readAsText(entry) + '\n\n';
      }
      decompressed = Buffer.from(allLogs);
    } else if (contentType === 'application/gzip') {
      decompressed = await gunzip(response.data);
    } else {
      decompressed = response.data;
    }
    
    console.log("Logs fetched and processed successfully.");
    return decompressed.toString('utf-8');
  } catch (error: any) {
    console.error("Error fetching workflow run logs:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response headers:", JSON.stringify(error.response.headers, null, 2));
    }
    return "Failed to fetch logs";
  }
}

async function getWorkflowSteps(token: string, runId: number): Promise<any> {
  console.log(`Fetching workflow steps for run ID: ${runId}...`);
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}/jobs`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "CredEx-App/1.0"
  };

  try {
    const response = await axios.get(url, { headers });
    return response.data.jobs;
  } catch (error: any) {
    console.error("Error fetching workflow steps:", error.message);
    return [];
  }
}

async function waitForWorkflowCompletion(token: string, runId: number): Promise<{ status: string, conclusion: string | null }> {
  console.log(`Waiting for workflow (Run ID: ${runId}) to complete...`);
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "CredEx-App/1.0"
  };

  const startTime = Date.now();
  let lastStatus = '';
  let statusChangeCount = 0;
  while (true) {
    try {
      const response = await axios.get(url, { headers });
      const status = response.data.status;
      const conclusion = response.data.conclusion;

      if (status !== lastStatus) {
        console.log(`Workflow status: ${status}`);
        lastStatus = status;
        statusChangeCount++;
      }

      if (status === 'completed') {
        console.log(`Workflow completed with conclusion: ${conclusion}`);
        return { status, conclusion };
      }

      if (Date.now() - startTime > WORKFLOW_TIMEOUT) {
        console.error("Workflow timed out");
        return { status: 'timed_out', conclusion: null };
      }

      // Wait for 30 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Print a progress update every 5 status changes or every 5 minutes
      if (statusChangeCount % 5 === 0 || (Date.now() - startTime) % (5 * 60 * 1000) < 30000) {
        console.log(`Workflow still running. Current status: ${status}`);
      }
    } catch (error: any) {
      console.error("Error checking workflow status:", error.message);
      return { status: 'error', conclusion: null };
    }
  }
}

function parseAndHighlightLogs(logs: string): string {
  console.log("Parsing and highlighting logs...");
  const lines = logs.split('\n');
  const seenMessages = new Set<string>();
  const filteredLines = lines.filter(line => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('counting objects:') ||
        lowerLine.includes('compressing objects:') ||
        lowerLine.includes('receiving objects:') ||
        lowerLine.includes('resolving deltas:')) {
      const key = lowerLine.split(':')[0];
      if (seenMessages.has(key)) {
        return false;
      }
      seenMessages.add(key);
    }
    return true;
  });

  const highlightedLines = filteredLines.map(line => {
    if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failure')) {
      return `\x1b[31m${line}\x1b[0m`; // Red color for errors
    }
    if (line.toLowerCase().includes('warning')) {
      return `\x1b[33m${line}\x1b[0m`; // Yellow color for warnings
    }
    return line;
  });
  return highlightedLines.join('\n');
}

function extractErrorMessages(logs: string): string[] {
  const errorLines = logs.split('\n').filter(line => 
    line.toLowerCase().includes('error') || 
    line.toLowerCase().includes('failure') ||
    line.toLowerCase().includes('exception')
  );
  return errorLines.map(line => line.trim());
}

async function runDeployment(token: string, installationId: string, privateKey: string): Promise<void> {
  try {
    console.log("Starting deployment...");
    const runId = await triggerDevelopmentWorkflow(token);
    console.log(`Deployment workflow triggered. Run ID: ${runId}`);

    const { status, conclusion } = await waitForWorkflowCompletion(token, runId);
    
    const logs = await getWorkflowRunLogs(token, runId);
    const steps = await getWorkflowSteps(token, runId);

    console.log("\nWorkflow Steps:");
    steps.forEach((step: any) => {
      console.log(`- ${step.name}: ${step.conclusion || step.status}`);
    });

    console.log("\nWorkflow Logs:");
    console.log(parseAndHighlightLogs(logs));

    console.log("\nDeployment Summary:");
    console.log(`Status: ${status}`);
    console.log(`Conclusion: ${conclusion || 'N/A'}`);

    if (status === 'timed_out') {
      console.error("Deployment timed out. Please check the GitHub Actions page for more information.");
      process.exit(1);
    }

    if (conclusion !== 'success') {
      console.error("Deployment failed. Extracted error messages:");
      const errorMessages = extractErrorMessages(logs);
      errorMessages.forEach(msg => console.error(`- ${msg}`));
      process.exit(1);
    }

    console.log("Deployment completed successfully.");
  } catch (error: any) {
    console.error("Deployment failed:", error.message);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const scriptStartTime = Date.now();
  
  try {
    console.log("Starting deployment process...");
    checkRequiredEnvVariables();
    
    const config = await getConfig();

    if (!config.deployment || !config.deployment.github) {
      throw new Error("Deployment configuration is missing. Check your environment variables.");
    }

    const { installationId } = config.deployment.github;
    const privateKey = getPrivateKey();

    if (!installationId || !privateKey) {
      throw new Error("GitHub App credentials are missing. Check your environment variables.");
    }

    const token = await getInstallationToken(installationId, privateKey);
    await runDeployment(token, installationId, privateKey);

  } catch (error: any) {
    console.error("Deployment failed:", error.message);
    process.exit(1);
  } finally {
    const scriptEndTime = Date.now();
    const scriptDuration = (scriptEndTime - scriptStartTime) / 1000;
    console.log(`Total script execution time: ${scriptDuration.toFixed(2)} seconds`);
  }
}

// Wrap the main function with a timeout
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error("Script execution timed out")), SCRIPT_TIMEOUT);
});

Promise.race([main(), timeoutPromise])
  .catch(error => {
    console.error("Script failed:", error.message);
    process.exit(1);
  });
