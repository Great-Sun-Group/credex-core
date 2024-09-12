# Credex Ecosystem Core API

The credex ecosystem is a shared ledger that enables the efficient circulation of value, accumulation of capital, investment of profits, and giving of gifts. It is a tool for financial inclusion, financial empowerment, and financial sovereignty.

## Credex Principle

**If I owe you,**\
**and you owe them,**\
**and they owe me,**\
**we're square.**

The credex ecosystem actualizes the Credex Principle in the Minute Transaction Queue (MTQ), which tracks payable and receivable invoices for members' accounts, finds loops of value creation, and cancels payable and receivable invoices against each other in "credloops" in which every debt is reduced by an equal value. This is a GAAP-compliant accounting process that any person or business can benefit from.

In accounting terms, a credex is a contingent asset for one party and a contingent liability for the other. These asset/liability pairs are automatically strung together into credloops wherever possible across the credex ecosystem. When a credloop is created and cleared, every account in the loop will have an accounts payable invoice cancelled against an equivalent accounts receivable invoice.


## Credcoin Principle

**Every human is entitled to one equal share of the value of the natural wealth entering the organic economy.**\
**Every human is responsible to provide value equal to the amount of natural wealth that they consume.**

The ecosystem actualizes the Credcoin Principle in the Daily Credcoin Offering (DCO), which updates exchange rates across the ecosystem daily. Every 24h, the DCO makes this equation true: one credcoin today equals the number of members participating in the DCO today divided by the value of natural wealth entering the organic economy through the DCO today.

The organic economy is a subset of the credex ecosystem, which is a subset of the global economy, which is the human-enhanced subset of the world that is given to us by nature. The organic economy is an economy in which wealth circulates, profit accumulates, investment is made, and gifts are given in alignment and long-term harmony with the biological environment of our habitat and the physical laws that bind us.

The value of the natural wealth processed by the DCO is split into two portions: gift portion and market portion. Currently, in the MVP version we've developed in this repository, only the gift portion of the DCO is implemented. The market portion will be added later.

The credex ecosystem stores values in credcoin (CXX). In order to natively enable multi-denominational accounting, a CXXmultiplier value is stored alongside every CXX value. Both of these values are updated in every DCO so that the credex remains true to the face value in the denomination specified, and to other values stored in the ecosystem. A value expressed in CXX represents that value in relationship to every other value stored in the ecosystem. A value in CXX divided by its CXX multiplier expresses the value in the chosen denomination (face value).

The system manages the balance between local truth (preserving the face value of contracts in their specified denomination) and global truth (adjusting all values relative to credcoin) through the daily rate and value adjustments in the DCO.

## Neo4j databases

Credex-core runs on two neo4j databases. LedgerSpace is the shared ledger containing the full state of the credex ecosystem. SearchSpace contains only unredeemed credexes, and is optimized to find credloops. On every credloop found and cleared, ledgerSpace is updated accordingly

## Express.js server

The express.js server is initialized in `src/index.ts`, which provides the cronjobs and endpoints that power the ecosystem and enable members and client apps to interact with its ledger.

## Cronjobs

The Core module hosts the cronjobs:

- DailyCredcoinOffering() runs every day at midnight UTC.
- MinuteTransactionQueue() runs every minute, clearing credloops of value creation across the ecosystem.

## Endpoints

Controllers for the endpoints are imported, and endpoints created for the various modules: Member, Account, Avatar, Credex, and AdminDashboard.

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

4. Once the container is ready, copy the `.env.example` file to `.env` and fill in the necessary environment variables.

5. Start the development server:
   ```bash
   npm run dev
   ```

### Codespaces Development

1. Open the project in GitHub Codespaces.

2. The devcontainer will automatically set up the development environment with all necessary dependencies and environment variables. If your environment variables are not set in your codespaces, you can copy the `.env.example` file to `.env` and fill in the necessary environment variables there.


3. Start the development server:
   ```bash
   npm run dev
   ```

## Environment variables configuration

To set up your development environment, you'll need to configure the following environment variables:

1. PORT: Set this to 5000 for local development.
2. NODE_ENV: Set this to 'development' for local development.
3. DEPLOYMENT: Set this to 'dev' for development deployment.

4. NEO4J_LEDGER_SPACE_BOLT_URL, NEO4J_LEDGER_SPACE_USER, NEO4J_LEDGER_SPACE_PASS:
   - Sign up for a free Neo4j Aura account at https://neo4j.com/cloud/aura/
   - Create a new database instance for ledgerSpace
   - Use the provided connection details to fill in these variables

5. NEO4J_SEARCH_SPACE_BOLT_URL, NEO4J_SEARCH_SPACE_USER, NEO4J_SEARCH_SPACE_PASS:
   - Create a second Neo4j Aura account using a different email address and create a new database instance for searchSpace

6. OPEN_EXCHANGE_RATES_API:
   - Sign up for a free account at https://openexchangerates.org/
   - Go to your account dashboard and create and copy your API key

7. JWT_SECRET: Create a strong, unique string to use as your JWT secret

8. GIT_PERSONAL_ACCESS_TOKEN: Create a personal access token on GitHub with appropriate permissions

## Available Scripts

- `npm run dev`: Start the development server with nodemon
- `npm run build`: Build the TypeScript project
- `npm run start`: Start the production server
- `npm run test`: Run the test suite
- `npm run lint`: Run ESLint to check for code quality issues
- `npm run format`: Run Prettier to format the code

## Module Documentation

- [Daily Credcoin Offering (DCO)](<docs/Daily_Credcoin_Offering_(DCO).md>)
- [Minute Transaction Queue (MTQ)](<docs/MinuteTransactionQueue_(MTQ).md>)
- [Member](docs/Member.md)
- [Account](docs/Account.md)
- [Credex](docs/Credex.md)
- [Avatar](docs/Avatar.md)
- [AdminDashboard](docs/AdminDashboard.md)

## Schemas

- [ledgerSpace Schema](docs/ledgerSpace_schema.md)
- [searchSpace Schema](docs/searchSpace_schema.md)

## Developer Guides

- [Logging Best Practices](docs/logging_best_practices.md)
- [Security and Authentication](docs/Security_and_Authentication.md)
- [Security Overview](docs/security.md)
- [Swagger API Documentation](docs/swagger.md)

## Project structure and code summary
For a detailed overview of the codebase, including function and class definitions, please refer to the [Code Summary](docs/code_summary.md). This summary is particularly useful for AI context and assists in understanding the overall structure and key components of the project.

```
credex-core/
├── .githooks/             # Git hooks scripts
├── .vscode/               # VS Code configuration files
├── build/                 # Compiled output
├── config/                # Configuration files
├── docs/                  # Documentation files
├── src/                   # Source code
│   ├── api/               # API-related code
│   │   ├── Account/       # Account-related endpoints and services
│   │   ├── AdminDashboard/# Admin dashboard endpoints and services
│   │   ├── Avatar/        # Avatar-related endpoints and services
│   │   ├── Credex/        # Credex-related endpoints and services
│   │   └── Member/        # Member-related endpoints and services
│   ├── constants/         # Constant values used across the application
│   ├── core-cron/         # Core cron jobs (DCO and MTQ)
│   │   ├── DCO/           # Daily Credcoin Offering related code
│   │   └── MTQ/           # Minute Transaction Queue related code
│   ├── middleware/        # Express middleware
│   ├── tests/             # Test files
│   └── utils/             # Utility functions and helpers
```

## Contributing

1. Create a branch from the 'dev' branch.
2. Make your changes and commit them with clear, concise commit messages.
3. Push your changes and create a pull request against the 'dev' branch.
4. Follow the [Logging Best Practices](docs/logging_best_practices.md) when adding or modifying code.

## License

You are welcome to explore, experiment with, and build upon this work for research, development, modelling, testing, demonstrations, and other non-commercial purposes. Please contribute!

The use of this software in any production environment is strictly prohibited. You do not have permission to use this software to track real debts. Real data of past transactions may be used, but only as data input. If you want to transact real value with credex, you are invited to become a member of the credex ecosystem.

If you create something new based on this project, you must use the same license terms and give appropriate credit to the original work. You may not sell the software or any product or service that substantially relies on its functionality.

This approach allows for community engagement and experimentation while ensuring the integrity and unity of the system as a single shared economic network that all can access and benefit from.