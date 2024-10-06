import dotenv from 'dotenv';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';
const useAwsSecrets = isProduction || isStaging;

/**
 * Retrieves a secret from AWS Secrets Manager.
 * @param secretName The name of the secret to retrieve.
 * @returns The secret value as a parsed JSON object.
 */
async function getAwsSecret(secretName: string): Promise<any> {
  const client = new SecretsManager({ region: process.env.AWS_REGION });
  try {
    const response = await client.getSecretValue({ SecretId: secretName });
    if (response.SecretString) {
      return JSON.parse(response.SecretString);
    }
    throw new Error('Secret string is empty');
  } catch (error) {
    console.error('Error retrieving secret from AWS Secrets Manager:', error);
    throw error;
  }
}

/**
 * Validates environment variables and retrieves secrets from AWS Secrets Manager when necessary.
 * @param requiredVars An array of required environment variable names.
 * @returns An object containing the validated environment variables.
 */
async function validateEnv(requiredVars: string[]): Promise<{ [key: string]: string }> {
  const missingVars = [];
  const envVars: { [key: string]: string } = {};

  for (const varName of requiredVars) {
    if (useAwsSecrets && varName.startsWith('NEO_4J_')) {
      const secretName = isProduction ? 'neo4j_prod_secrets' : 'neo4j_stage_secrets';
      try {
        const secrets = await getAwsSecret(secretName);
        const awsVarName = varName.toLowerCase().replace('neo_4j_', '').replace(/_/g, '');
        if (secrets[awsVarName]) {
          envVars[varName] = secrets[awsVarName];
        } else {
          missingVars.push(varName);
        }
      } catch (error) {
        console.error(`Failed to retrieve ${varName} from AWS Secrets Manager:`, error);
        // Fallback to environment variables if AWS Secrets Manager fails
        if (process.env[varName]) {
          envVars[varName] = process.env[varName]!;
        } else {
          missingVars.push(varName);
        }
      }
    } else if (!process.env[varName]) {
      missingVars.push(varName);
    } else {
      envVars[varName] = process.env[varName]!;
    }
  }

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return envVars;
}

const requiredEnvVars = [
  'NODE_ENV',
  'NEO_4J_LEDGER_SPACE_BOLT_URL',
  'NEO_4J_LEDGER_SPACE_USER',
  'NEO_4J_LEDGER_SPACE_PASS',
  'NEO_4J_SEARCH_SPACE_BOLT_URL',
  'NEO_4J_SEARCH_SPACE_USER',
  'NEO_4J_SEARCH_SPACE_PASS',
  'OPEN_EXCHANGE_RATES_API',
  'JWT_SECRET'
];

let configPromise: Promise<any>;

async function initConfig() {
  const envVars = await validateEnv(requiredEnvVars);

  return {
    environment: envVars.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    logLevel: isProduction ? 'info' : 'debug',
    fallbackPorts: [5001, 5002, 5003, 5004, 5005],
    database: {
      neo4jLedgerSpace: {
        boltUrl: envVars.NEO_4J_LEDGER_SPACE_BOLT_URL,
        user: envVars.NEO_4J_LEDGER_SPACE_USER,
        password: envVars.NEO_4J_LEDGER_SPACE_PASS
      },
      neo4jSearchSpace: {
        boltUrl: envVars.NEO_4J_SEARCH_SPACE_BOLT_URL,
        user: envVars.NEO_4J_SEARCH_SPACE_USER,
        password: envVars.NEO_4J_SEARCH_SPACE_PASS
      }
    },
    api: {
      openExchangeRates: {
        apiKey: envVars.OPEN_EXCHANGE_RATES_API
      }
    },
    security: {
      jwtSecret: envVars.JWT_SECRET
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
    cron: {
      dailyCredcoinOffering: '0 0 * * *', // Every day at midnight UTC
      minuteTransactionQueue: '* * * * *', // Every minute
    },
  };
}

export async function getConfig() {
  if (!configPromise) {
    configPromise = initConfig();
  }
  return configPromise;
}

export async function logConfig(logger: any) {
  const config = await getConfig();
  logger.info('Application configuration loaded', {
    environment: config.environment,
    port: config.port,
    logLevel: config.logLevel,
    fallbackPorts: config.fallbackPorts,
    neo4jLedgerSpaceUrl: config.database.neo4jLedgerSpace.boltUrl,
    neo4jSearchSpaceUrl: config.database.neo4jSearchSpace.boltUrl,
    rateLimitWindowMs: config.rateLimit.windowMs,
    rateLimitMax: config.rateLimit.max,
    cronDailyCredcoinOffering: config.cron.dailyCredcoinOffering,
    cronMinuteTransactionQueue: config.cron.minuteTransactionQueue,
    usingAwsSecrets: useAwsSecrets
  });
}

export default getConfig();