module.exports = {
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  database: {
    neo4jLedgerSpace: {
      boltUrl: process.env.NEO4J_LEDGER_SPACE_BOLT_URL,
      user: process.env.NEO4J_LEDGER_SPACE_USER,
      password: process.env.NEO4J_LEDGER_SPACE_PASS
    },
    neo4jSearchSpace: {
      boltUrl: process.env.NEO4J_SEARCH_SPACE_BOLT_URL,
      user: process.env.NEO4J_SEARCH_SPACE_USER,
      password: process.env.NEO4J_SEARCH_SPACE_PASS
    }
  },
  api: {
    openExchangeRates: {
      apiKey: process.env.OPEN_EXCHANGE_RATES_API_KEY
    }
  },
  security: {
    jwtSecret: process.env.JWT_SECRET
  }
};