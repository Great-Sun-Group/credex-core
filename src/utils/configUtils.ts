import dotenv from "dotenv";
import path from "path";
import logger from "../utils/logger";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

interface Config {
  port: number;
  nodeEnv: string;
  logLevel: string;
  ledgerSpace: {
    uri: string;
    user: string;
    password: string;
  };
  searchSpace: {
    uri: string;
    user: string;
    password: string;
  };
  jwtSecret: string;
  rateLimit: {
    windowMs: number;
    max: number;
  };
  openExchangeRatesApi: string;
}

class ConfigUtils {
  private static instance: ConfigUtils;
  private config: Config;

  private constructor() {
    logger.debug("Initializing ConfigUtils");
    this.config = {
      port: parseInt(process.env.PORT || "3000", 10),
      nodeEnv: process.env.NODE_ENV || "development",
      logLevel: process.env.LOG_LEVEL || "info",
      ledgerSpace: {
        uri: process.env.NEO_4J_LEDGER_SPACE_BOLT_URL || "",
        user: process.env.NEO_4J_LEDGER_SPACE_USER || "",
        password: process.env.NEO_4J_LEDGER_SPACE_PASS || "",
      },
      searchSpace: {
        uri: process.env.NEO_4J_SEARCH_SPACE_BOLT_URL || "",
        user: process.env.NEO_4J_SEARCH_SPACE_USER || "",
        password: process.env.NEO_4J_SEARCH_SPACE_PASS || "",
      },
      jwtSecret: process.env.JWT_SECRET || "",
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
      },
      openExchangeRatesApi: process.env.OPEN_EXCHANGE_RATES_API || "",
    };
    logger.debug("ConfigUtils initialized", {
      nodeEnv: this.config.nodeEnv,
      logLevel: this.config.logLevel,
    });
  }

  public static getInstance(): ConfigUtils {
    if (!ConfigUtils.instance) {
      ConfigUtils.instance = new ConfigUtils();
    }
    return ConfigUtils.instance;
  }

  public getConfig(): Config {
    return this.config;
  }

  public get<K extends keyof Config>(key: K): Config[K] {
    logger.debug(`Getting config value for key: ${key as string}`);
    return this.config[key];
  }

  public set<K extends keyof Config>(key: K, value: Config[K]): void {
    logger.debug(`Setting config value for key: ${key as string}`);
    this.config[key] = value;
  }

  // Add validation for all required fields
  public validate(): void {
    logger.debug("Validating configuration");
    const requiredFields: (keyof Config)[] = [
      "port",
      "nodeEnv",
      "ledgerSpace",
      "searchSpace",
      "jwtSecret",
      "openExchangeRatesApi",
    ];
    for (const field of requiredFields) {
      if (!this.config[field]) {
        logger.error(`Missing required configuration: ${field as string}`);
        throw new Error(`Missing required configuration: ${field as string}`);
      }
    }

    // Validate nested objects
    const validateNestedObject = (obj: any, prefix: string) => {
      for (const key in obj) {
        if (obj[key] === "") {
          logger.error(`Missing required configuration: ${prefix}${key}`);
          throw new Error(`Missing required configuration: ${prefix}${key}`);
        }
      }
    };

    validateNestedObject(this.config.ledgerSpace, "ledgerSpace.");
    validateNestedObject(this.config.searchSpace, "searchSpace.");
    logger.info("Configuration validation completed successfully");
  }
}

export const configUtils = ConfigUtils.getInstance();
configUtils.validate(); // Validate configuration on import

export default configUtils;
