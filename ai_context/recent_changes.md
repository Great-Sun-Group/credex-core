# Recent Changes
## README.md
```
# Credex Ecosystem Core API

## Credex Principle

**If I owe you,**\
**and you owe them,**\
**and they owe me,**\
**we're square.**

## Credcoin Principle

**Every human is entitled to one equal share of the value of the natural wealth entering the organic economy.**\
**Every human is responsible to provide value equal to the amount of natural wealth that they consume.**

The credex ecosystem actualizes the Credex Principle in the Minute Transaction Queue (MTQ), which tracks payable and receivable invoices for members' accounts, finds loops of value creation, and cancels payable and receivable invoices against each other in "credloops" in which every debt is reduced by an equal value. This is a GAAP-compliant accounting process that any person and any business can benefit from.

The ecosystem actualizes the Credcoin Principle in the Daily Credcoin Offering (DCO), which updates exchange rates across the ecosystem daily. Every 24h, the DCO makes this equation true: one credcoin today equals the number of members participating in the DCO today divided by the value of natural wealth entering the organic economy through the DCO today.

The organic economy is a subset of the credex ecosystem, which is a subset of the global economy, which is the human-enhanced subset of the world that is given to us by nature. The organic economy is an economy in which wealth circulates, profit accumulates, investment is made, and gifts are given in alignment and long-term harmony with the biological environment of our habitat and the physical laws that bind us.

The value of the natural wealth processed by the DCO is split into two portions: gift portion and market portion. Currently, in the mvp version we've developed in this repository, only the gift portion of the DCO is implemented. The market portion will be added later.

The credex ecosystem stores values in credcoin (CXX). In order to natively enable multi-denominational accounting, a CXXmultiplier value is stored alongside every CXX value. Both of these values are updated in every DCO so that the credex remains true to the face value in the denomination specified, and to other values stored in the ecosystem. A value expressed in CXX represents that value in relationship to every other value stored in the ecosystem. A value in CXX divided by its CXX multiplier expresses the value in the chosen denomination (face value).

The system manages the balance between local truth (preserving the face value of contracts in their specified denomination) and global truth (adjusting all values relative to credcoin) through the daily rate and value adjustments in the DCO. This implementation creates a robust ecosystem that manages accounting processes across any denomination, clears debts automatically, and adjusts values dynamically.

## express.js server

The express.js server is initialized with index.ts, which provides the cronjobs and endpoints that power the ecosystem and enable members and client apps to interact with its ledger.

## cronjobs

The Core module hosts the cronjobs:

- DailyCredcoinOffering() runs every day at midnight UTC.
- MinuteTransactionQueue() runs every minute, clearing credloops of value creation across the ecosystem.

### endpoints

Controllers for the endpoints are imported, and endpoints created for the various modules: Member, Account, Avatar, Admin, and DevAdmin.

## Development Setup

### Local Development with devcontainer

#### Prerequisites

- Docker and Docker Compose
- Visual Studio Code with Remote - Containers extension

#### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/Credex/credex-core.git
   ```

2. Open the project in Visual Studio Code.

3. When prompted, click "Reopen in Container" to start the dev container. This will set up a consistent development environment with all necessary dependencies.

4. Once the container is ready, copy the `.env.example` file to `.env` and fill in the necessary environment variables:
   ```bash
   cp .env.example .env
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Codespaces Development

1. Open the project in GitHub Codespaces.

2. The devcontainer will automatically set up the development environment with all necessary dependencies and environment variables.

3. Start the development server:
   ```bash
   npm run dev
   ```

4. To access the forwarded port:
   - Click on the "Ports" tab in the Codespaces interface
   - Find the forwarded port for the application (usually 5000)
   - Click on the link to open the application in a new tab

### Using Postman for API Testing

1. Install the Postman extension in VS Code and sign in to your Postman account.

2. Open the Credex Team Workspace in Postman.

3. In the terminal, print the GitHub Token:
   ```bash
   echo $GITHUB_TOKEN
   ```

4. Copy the token and paste it into the "X-Github-Token" field in the credex-core variables in Postman.

5. After starting the development server, copy the forwarded port address from the "Ports" tab and paste it into the "base_url" field in the credex-core variables in Postman.

Note: The GitHub token needs to be updated for each new Codespace session. The base_url will remain constant for a specific Codespace, even across multiple sessions.

## Available Scripts

- `npm run dev`: Start the development server with nodemon
- `npm run build`: Build the TypeScript project
- `npm run start`: Start the production server
- `npm run test`: Run the test suite
- `npm run lint`: Run ESLint to check for code quality issues
- `npm run format`: Run Prettier to format the code

## Module Documentation

- [Daily Credcoin Offering (DCO)](docs/Daily_Credcoin_Offering_(DCO).md)
- [Minute Transaction Queue (MTQ)](docs/MinuteTransactionQueue_(MTQ).md)
- [Member](docs/Member.md)
- [Account](docs/Account.md)
- [Credex](docs/Credex.md)
- [Avatar](docs/Avatar.md)
- [Admin](docs/Admin.md)
- [DevAdmin](docs/DevAdmin.md)
- [ledgerSpace Schema](docs/ledgerSpace_schema.md)
- [searchSpace Schema](docs/searchSpace_schema.md)

## Contributing

1. Create a branch from the 'dev' branch.
2. Make your changes and commit them with clear, concise commit messages.
3. Push your changes and create a pull request against the 'dev' branch.

## License

[Add license information here]
```

## config/authenticate.ts
```
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "./config";

interface UserRequest extends Request {
  user?: any;
}

/**
 * Middleware to authenticate API requests using a WhatsApp Bot API key.
 * This middleware should be applied to routes that require authentication.
 *
 * @param req - The Express request object
 * @param res - The Express response object
 * @param next - The next middleware function
 */
const authenticate = (req: UserRequest, res: Response, next: NextFunction) => {
  const apiKeySubmitted = req.header("whatsappBotAPIkey");
  const validApiKey = config.whatsappBotApiKey;

  if (!validApiKey) {
    console.error(
      "WHATSAPP_BOT_API_KEY is not defined in environment variables"
    );
    return res.status(500).json({ message: "Server configuration error" });
  }

  if (!apiKeySubmitted) {
    console.warn("Authentication failed: API key not provided.");
    return res.status(401).json({ message: "API key is required" });
  }

  // Use timing-safe comparison to prevent timing attacks
  if (crypto.timingSafeEqual(Buffer.from(apiKeySubmitted), Buffer.from(validApiKey))) {
    next();
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export default authenticate;

// TODO: Consider implementing a more robust authentication system,
// such as JWT or OAuth2, for enhanced security and flexibility
```

## config/config.ts
```
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  deployment: process.env.DEPLOYMENT || 'dev',

  // WhatsApp Bot API configuration
  whatsappBotApiKey: process.env.WHATSAPP_BOT_API_KEY,

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
// and throw meaningful errors if they're missing```

## config/logger.ts
```
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { config } from "./config";
import { v4 as uuidv4 } from 'uuid';

// Configure the logger
const logger = winston.createLogger({
  level: config.nodeEnv === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "credex-core" },
  transports: [
    // Rotate error logs daily
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
    }),
    // Rotate combined logs daily
    new DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

// Add console transport for non-production environments
if (config.nodeEnv !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

function sanitizeData(data: any): any {
  const sensitiveFields = ['password', 'token', 'apiKey', 'creditCard'];
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).reduce((acc: { [key: string]: any }, key: string) => {
      if (sensitiveFields.includes(key)) {
        acc[key] = '[REDACTED]';
      } else if (typeof data[key] === 'object') {
        acc[key] = sanitizeData(data[key]);
      } else {
        acc[key] = data[key];
      }
      return acc;
    }, {});
  }
  return data;
}

export default logger;

/**
 * Middleware for adding a unique request ID
 */
export const addRequestId = (req: any, res: any, next: any) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Middleware for logging Express requests
 */
export const expressLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info('User Input', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      body: sanitizeData(req.body),
      params: sanitizeData(req.params),
      query: sanitizeData(req.query),
      headers: sanitizeData(req.headers),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  next();
};

/**
 * Middleware for logging errors
 */
export const errorLogger = (err: Error, req: any, res: any, next: any) => {
  logger.error('Error', {
    requestId: req.id,
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: sanitizeData(req.body),
    params: sanitizeData(req.params),
    query: sanitizeData(req.query),
    headers: sanitizeData(req.headers)
  });
  next(err);
};

/**
 * Function to log DCO rates
 */
export const logDCORates = (XAUrate: number, CXXrate: number, CXXmultiplier: number) => {
  logger.info('DCO Rates', { XAUrate, CXXrate, CXXmultiplier });
};

// TODO: Implement log aggregation and centralized logging for production environments
// TODO: Implement log retention policies based on compliance requirements
// TODO: Add performance monitoring for database queries and external API calls
// TODO: Implement log analysis tools to detect patterns, anomalies, and potential security threats
```

