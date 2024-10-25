import dotenv from "dotenv";
import winston from "winston";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const isStaging = process.env.NODE_ENV === "staging";
const isDevelopment = process.env.NODE_ENV === "development";

// Create a logger
const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

/**
 * Validates environment variables.
 * @param requiredVars An array of required environment variable names.
 * @returns An object containing the validated environment variables.
 */
function validateEnv(requiredVars: string[]): {
  [key: string]: string | undefined;
} {
  const missingVars = [];
  const envVars: { [key: string]: string | undefined } = {};

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    } else {
      envVars[varName] = process.env[varName];
    }
  }

  if (missingVars.length > 0) {
    logger.error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }

  return envVars;
}

const requiredEnvVars = [
  "NODE_ENV",
  "NEO_4J_LEDGER_SPACE_USER",
  "NEO_4J_LEDGER_SPACE_PASS",
  "NEO_4J_SEARCH_SPACE_USER",
  "NEO_4J_SEARCH_SPACE_PASS",
  "NEO_4J_LEDGER_SPACE_BOLT_URL",
  "NEO_4J_SEARCH_SPACE_BOLT_URL",
  "OPEN_EXCHANGE_RATES_API",
  "JWT_SECRET",
  "CLIENT_API_KEY",
];

let configPromise: Promise<any>;

async function initConfig() {
  logger.info("Initializing configuration");
  const envVars = validateEnv(requiredEnvVars);

  logger.debug("Environment variables validated", {
    requiredVarsPresent: requiredEnvVars.every((v) => !!envVars[v]),
  });

  const config = {
    environment: envVars.NODE_ENV,
    port: parseInt(process.env.PORT || "3000", 10),
    logLevel: isProduction ? "info" : "debug",
    fallbackPorts: [5001, 5002, 5003, 5004, 5005],
    database: {
      neo4jLedgerSpace: {
        boltUrl: envVars.NEO_4J_LEDGER_SPACE_BOLT_URL,
        user: envVars.NEO_4J_LEDGER_SPACE_USER,
        password: envVars.NEO_4J_LEDGER_SPACE_PASS,
        connectionTimeout: 60000, // Increase timeout to 60 seconds
      },
      neo4jSearchSpace: {
        boltUrl: envVars.NEO_4J_SEARCH_SPACE_BOLT_URL,
        user: envVars.NEO_4J_SEARCH_SPACE_USER,
        password: envVars.NEO_4J_SEARCH_SPACE_PASS,
        connectionTimeout: 60000, // Increase timeout to 60 seconds
      },
    },
    api: {
      openExchangeRates: {
        apiKey: envVars.OPEN_EXCHANGE_RATES_API,
      },
    },
    security: {
      jwtSecret: envVars.JWT_SECRET,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
    cron: {
      dailyCredcoinOffering: "0 0 * * *", // Every day at midnight UTC
      minuteTransactionQueue: "* * * * *", // Every minute
    },
  };

  logger.info("Configuration initialized", {
    environment: config.environment,
    port: config.port,
    logLevel: config.logLevel,
    neo4jLedgerSpaceBoltUrl: config.database.neo4jLedgerSpace.boltUrl,
    neo4jSearchSpaceBoltUrl: config.database.neo4jSearchSpace.boltUrl,
    connectionTimeout: config.database.neo4jLedgerSpace.connectionTimeout,
  });

  return config;
}

export async function getConfig() {
  if (!configPromise) {
    configPromise = initConfig();
  }
  return configPromise;
}

export async function logConfig(logger: any) {
  const config = await getConfig();
  logger.info("Application configuration loaded", {
    environment: config.environment,
    port: config.port,
    logLevel: config.logLevel,
    fallbackPorts: config.fallbackPorts,
    neo4jLedgerSpaceUrl: config.database.neo4jLedgerSpace.boltUrl,
    neo4jSearchSpaceUrl: config.database.neo4jSearchSpace.boltUrl,
    connectionTimeout: config.database.neo4jLedgerSpace.connectionTimeout,
    rateLimitWindowMs: config.rateLimit.windowMs,
    rateLimitMax: config.rateLimit.max,
    cronDailyCredcoinOffering: config.cron.dailyCredcoinOffering,
    cronMinuteTransactionQueue: config.cron.minuteTransactionQueue,
  });
}

export default getConfig();
