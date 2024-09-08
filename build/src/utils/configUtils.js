"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configUtils = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
class ConfigUtils {
    constructor() {
        this.config = {
            port: parseInt(process.env.PORT || '3000', 10),
            nodeEnv: process.env.NODE_ENV || 'development',
            logLevel: process.env.LOG_LEVEL || 'info',
            ledgerSpace: {
                uri: process.env.NEO_4J_LEDGER_SPACE_BOLT_URL || '',
                user: process.env.NEO_4J_LEDGER_SPACE_USER || '',
                password: process.env.NEO_4J_LEDGER_SPACE_PASS || '',
            },
            searchSpace: {
                uri: process.env.NEO_4J_SEARCH_SPACE_BOLT_URL || '',
                user: process.env.NEO_4J_SEARCH_SPACE_USER || '',
                password: process.env.NEO_4J_SEARCH_SPACE_PASS || '',
            },
            jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
            jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
            rateLimit: {
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
                max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
            },
            // Initialize other configuration properties here
        };
    }
    static getInstance() {
        if (!ConfigUtils.instance) {
            ConfigUtils.instance = new ConfigUtils();
        }
        return ConfigUtils.instance;
    }
    getConfig() {
        return this.config;
    }
    get(key) {
        return this.config[key];
    }
    set(key, value) {
        this.config[key] = value;
    }
    // Add basic validation for required fields
    validate() {
        const requiredFields = ['ledgerSpace', 'searchSpace', 'jwtSecret'];
        for (const field of requiredFields) {
            if (!this.config[field]) {
                throw new Error(`Missing required configuration: ${field}`);
            }
        }
        // Validate nested objects
        const validateNestedObject = (obj, prefix) => {
            for (const key in obj) {
                if (obj[key] === '') {
                    throw new Error(`Missing required configuration: ${prefix}${key}`);
                }
            }
        };
        validateNestedObject(this.config.ledgerSpace, 'ledgerSpace.');
        validateNestedObject(this.config.searchSpace, 'searchSpace.');
    }
}
exports.configUtils = ConfigUtils.getInstance();
exports.configUtils.validate(); // Validate configuration on import
exports.default = exports.configUtils;
//# sourceMappingURL=configUtils.js.map