# Credex Ecosystem Core API

The credex ecosystem is a shared ledger that enables the efficient circulation of value, accumulation of capital, investment of profits, and giving of gifts.

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

The value of the natural wealth processed by the DCO is split into two portions: gift portion and market portion. Currently, in the MVP version we've developed in this repository, only the gift portion of the DCO is implemented. The market portion will be added later.

The credex ecosystem stores values in credcoin (CXX). In order to natively enable multi-denominational accounting, a CXXmultiplier value is stored alongside every CXX value. Both of these values are updated in every DCO so that the credex remains true to the face value in the denomination specified, and to other values stored in the ecosystem. A value expressed in CXX represents that value in relationship to every other value stored in the ecosystem. A value in CXX divided by its CXX multiplier expresses the value in the chosen denomination (face value).

The system manages the balance between local truth (preserving the face value of contracts in their specified denomination) and global truth (adjusting all values relative to credcoin) through the daily rate and value adjustments in the DCO. This implementation creates a robust ecosystem that manages accounting processes across any denomination, clears debts automatically, and adjusts values dynamically.

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

### Using Postman for API Testing

1. Navigate to the Postman extension in VS Code and sign in to your Postman account.

2. Open the Credex Team Workspace in Postman.

3. In the terminal, print the GitHub Token:

   ```bash
   echo $GITHUB_TOKEN
   ```

4. Copy the token and paste it into the "X-Github-Token" field in the credex-core variables in Postman.

5. After starting the development server, copy the forwarded port address from the "Ports" tab and paste it into the "base_url" field in the credex-core variables in Postman.

Note: The GitHub token needs to be updated for each new Codespace session. The base_url will remain constant for a specific Codespace, even across multiple sessions. If there are multiple team members using Postman at the same time, there may be conflicts in the tokens and base_urls.

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
// to be added: auth, testing

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

[Add license information here]
