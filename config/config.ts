import dotenv from 'dotenv';

dotenv.config();

function validateEnv(requiredVars: string[]): { [key: string]: string } {
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  return Object.fromEntries(requiredVars.map(varName => [varName, process.env[varName]!]));
}

const requiredEnvVars = [
  'NODE_ENV',
  'DEPLOYMENT',
  'NEO_4J_LEDGER_SPACE_BOLT_URL',
  'NEO_4J_LEDGER_SPACE_USER',
  'NEO_4J_LEDGER_SPACE_PASS',
  'NEO_4J_SEARCH_SPACE_BOLT_URL',
  'NEO_4J_SEARCH_SPACE_USER',
  'NEO_4J_SEARCH_SPACE_PASS',
  'OPEN_EXCHANGE_RATES_API'
];

const validatedEnv = validateEnv(requiredEnvVars);

export const config = {
  // Server configuration
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  fallbackPorts: [5001, 5002, 5003, 5004, 5005], // Add fallback ports
  nodeEnv: validatedEnv.NODE_ENV,
  deployment: validatedEnv.DEPLOYMENT,

  // Neo4j database configuration
  neo4j: {
    ledgerSpace: {
      url: validatedEnv.NEO_4J_LEDGER_SPACE_BOLT_URL,
      user: validatedEnv.NEO_4J_LEDGER_SPACE_USER,
      password: validatedEnv.NEO_4J_LEDGER_SPACE_PASS,
    },
    searchSpace: {
      url: validatedEnv.NEO_4J_SEARCH_SPACE_BOLT_URL,
      user: validatedEnv.NEO_4J_SEARCH_SPACE_USER,
      password: validatedEnv.NEO_4J_SEARCH_SPACE_PASS,
    },
  },

  // External API configuration
  openExchangeRatesApiKey: validatedEnv.OPEN_EXCHANGE_RATES_API,

  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // Cron job schedules
  cron: {
    dailyCredcoinOffering: '0 0 * * *', // Every day at midnight UTC
    minuteTransactionQueue: '* * * * *', // Every minute
  },
};

export function logConfig(logger: any) {
  logger.info('Application configuration loaded', {
    port: config.port,
    fallbackPorts: config.fallbackPorts,
    nodeEnv: config.nodeEnv,
    deployment: config.deployment,
    neo4jLedgerSpaceUrl: config.neo4j.ledgerSpace.url,
    neo4jSearchSpaceUrl: config.neo4j.searchSpace.url,
    rateLimitWindowMs: config.rateLimit.windowMs,
    rateLimitMax: config.rateLimit.max,
    cronDailyCredcoinOffering: config.cron.dailyCredcoinOffering,
    cronMinuteTransactionQueue: config.cron.minuteTransactionQueue,
  });
}