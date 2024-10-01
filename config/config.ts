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
  'NEO_4J_LEDGER_SPACE_BOLT_URL',
  'NEO_4J_LEDGER_SPACE_USER',
  'NEO_4J_LEDGER_SPACE_PASS',
  'NEO_4J_SEARCH_SPACE_BOLT_URL',
  'NEO_4J_SEARCH_SPACE_USER',
  'NEO_4J_SEARCH_SPACE_PASS',
  'OPEN_EXCHANGE_RATES_API',
  'JWT_SECRET'
];

const validatedEnv = validateEnv(requiredEnvVars);

const config = {
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  fallbackPorts: [5001, 5002, 5003, 5004, 5005],
  database: {
    neo4jLedgerSpace: {
      boltUrl: process.env.NEO_4J_LEDGER_SPACE_BOLT_URL,
      user: process.env.NEO_4J_LEDGER_SPACE_USER,
      password: process.env.NEO_4J_LEDGER_SPACE_PASS
    },
    neo4jSearchSpace: {
      boltUrl: process.env.NEO_4J_SEARCH_SPACE_BOLT_URL,
      user: process.env.NEO_4J_SEARCH_SPACE_USER,
      password: process.env.NEO_4J_SEARCH_SPACE_PASS
    }
  },
  api: {
    openExchangeRates: {
      apiKey: process.env.OPEN_EXCHANGE_RATES_API
    }
  },
  security: {
    jwtSecret: process.env.JWT_SECRET
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

export function logConfig(logger: any) {
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

export default config;