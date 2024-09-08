"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    // Server configuration
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    deployment: process.env.DEPLOYMENT || 'dev',
    // WhatsApp Bot API configuration
    whatsappBotApiKey: process.env.WHATSAPP_BOT_API_KEY,
    whatsappBotIps: process.env.WHATSAPP_BOT_IPS ? process.env.WHATSAPP_BOT_IPS.split(',') : [],
    // Neo4j database configuration
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
    // External API configuration
    openExchangeRatesApiKey: process.env.OPEN_EXCHANGE_RATES_API,
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
// TODO: Consider adding validation for required environment variables
// and throw meaningful errors if they're missing
//# sourceMappingURL=config.js.map