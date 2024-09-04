import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  deployment: process.env.DEPLOYMENT || 'dev',
  whatsappBotApiKey: process.env.WHATSAPP_BOT_API_KEY,
  neo4j: {
    ledgerSpace: {
      url: process.env.NEO_4J_LEDGER_SPACE_BOLT_URL,
      user: process.env.NEO_4J_LEDGER_SPACE_USER,
      password: process.env.NEO_4J_LEDGER_SPACE_PASS,
    },
    searchSpace: {
      url: process.env.NEO_4J_SEARCH_SPACE_BOLT_URL,
      user: process.env.NEO_4J_SEARCH_SPACE_USER,
      password: process.env.NEO_4J_SEARCH_SPACE_PASS,
    },
  },
  openExchangeRatesApiKey: process.env.OPEN_EXCHANGE_RATES_API,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  cron: {
    dailyCredcoinOffering: '0 0 * * *', // Every day at midnight UTC
    minuteTransactionQueue: '* * * * *', // Every minute
  },
};