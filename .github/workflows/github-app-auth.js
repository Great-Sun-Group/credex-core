const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const APP_ID = process.env.GH_APP_ID;
const INSTALLATION_ID = process.env.GH_INSTALLATION_ID;
const PRIVATE_KEY = process.env.GH_APP_PRIVATE_KEY;
const REPO_OWNER = 'Great-Sun-Group';
const REPO_NAME = 'credex-core';

function generateJWT() {
  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
    iss: APP_ID,
  };

  return jwt.sign(payload, PRIVATE_KEY, { algorithm: 'RS256' });
}

async function getInstallationToken() {
  const jwtToken = generateJWT();

  try {
    const response = await axios.post(
      `https://api.github.com/app/installations/${INSTALLATION_ID}/access_tokens`,
      {},
      {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    return response.data.token;
  } catch (error) {
    console.error('Error getting installation token:', error.response ? error.response.data : error.message);
    throw error;
  }
}

async function triggerDevelopmentWorkflow(awsAccessKeyId, awsSecretAccessKey) {
  const token = await getInstallationToken();

  try {
    console.log('Triggering development deployment workflow...');
    const response = await axios.post(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/deploy-development.yml/dispatches`,
      {
        ref: 'dev',
        inputs: {
          branch: 'dev',
          aws_access_key_id: awsAccessKeyId,
          aws_secret_access_key: awsSecretAccessKey,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    console.log('Development deployment workflow triggered successfully');
    console.log('Response status:', response.status);
    return response.status;
  } catch (error) {
    console.error('Error triggering development deployment workflow:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

async function main() {
  try {
    // Read AWS credentials from environment variables
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error('AWS credentials are not set in the environment');
    }

    await triggerDevelopmentWorkflow(awsAccessKeyId, awsSecretAccessKey);
    console.log('Deployment workflow triggered. Check GitHub Actions for progress.');
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
}

main();
