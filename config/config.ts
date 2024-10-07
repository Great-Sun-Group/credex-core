import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Validates environment variables.
 * @param requiredVars An array of required environment variable names.
 * @param optionalVars An array of optional environment variable names.
 * @returns An object containing the validated environment variables.
 */
function validateEnv(requiredVars: string[], optionalVars: string[] = []): { [key: string]: string | undefined } {
  const missingVars = [];
  const envVars: { [key: string]: string | undefined } = {};

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    } else {
      envVars[varName] = process.env[varName];
    }
  }

  for (const varName of optionalVars) {
    envVars[varName] = process.env[varName];
  }

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return envVars;
}

const requiredEnvVars = [
  "NODE_ENV",
  "NEO_4J_LEDGER_SPACE_USER",
  "NEO_4J_LEDGER_SPACE_PASS",
  "NEO_4J_SEARCH_SPACE_USER",
  "NEO_4J_SEARCH_SPACE_PASS",
  "OPEN_EXCHANGE_RATES_API",
  "JWT_SECRET",
  "WHATSAPP_BOT_API_KEY"
];

const optionalEnvVars = [
  // For staging and production deployments these are to be obtained after initial deployment.
  // They will be present from the first run for development environments, where db creation is not done with IaC.
  "NEO_4J_LEDGER_SPACE_BOLT_URL",
  "NEO_4J_SEARCH_SPACE_BOLT_URL",

  // For deployers who need to test in the development deployment in AWS
  "AWS_ACCESS_KEY_ID", // need to confirm if this is needed
  "AWS_SECRET_ACCESS_KEY", // need to confirm if this is needed
  "GH_APP_ID",
  "GH_CLIENT_ID",
  "GH_INSTALLATION_ID",
  "GH_APP_PRIVATE_KEY",
];

let configPromise: Promise<any>;

async function initConfig() {
  const envVars = validateEnv(requiredEnvVars, optionalEnvVars);

  return {
    environment: envVars.NODE_ENV,
    port: parseInt(process.env.PORT || '5000', 10),
    logLevel: isProduction ? 'info' : 'debug',
    fallbackPorts: [5001, 5002, 5003, 5004, 5005],
    database: {
      neo4jLedgerSpace: {
        boltUrl: envVars.NEO_4J_LEDGER_SPACE_BOLT_URL || 'bolt://localhost:7687',
        user: envVars.NEO_4J_LEDGER_SPACE_USER,
        password: envVars.NEO_4J_LEDGER_SPACE_PASS
      },
      neo4jSearchSpace: {
        boltUrl: envVars.NEO_4J_SEARCH_SPACE_BOLT_URL || 'bolt://localhost:7687',
        user: envVars.NEO_4J_SEARCH_SPACE_USER,
        password: envVars.NEO_4J_SEARCH_SPACE_PASS
      }
    },
    api: {
      openExchangeRates: {
        apiKey: envVars.OPEN_EXCHANGE_RATES_API
      },
      whatsappBot: {
        apiKey: envVars.WHATSAPP_BOT_API_KEY
      }
    },
    security: {
      jwtSecret: envVars.JWT_SECRET
    },
    deployment: {
      aws: {
        accessKeyId: envVars.AWS_ACCESS_KEY_ID,
        secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY
      },
      github: {
        appId: envVars.GH_APP_ID,
        clientId: envVars.GH_CLIENT_ID,
        installationId: envVars.GH_INSTALLATION_ID,
        privateKey: envVars.GH_APP_PRIVATE_KEY
      }
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
  });
}

export default getConfig();
