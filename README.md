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

The value of the natural wealth processed by the DCO is split into two portions: gift portion and market portion. Currently, in the MVP version we've developed in this repository, only the gift portion of the DCO is implemented.

The credex ecosystem stores values in credcoin (CXX). In order to natively enable multi-denominational accounting, a CXXmultiplier value is stored alongside every CXX value. Both of these values are updated in every DCO so that the credex remains true to the face value in the denomination specified, and to other values stored in the ecosystem. A value expressed in CXX represents that value in relationship to every other value stored in the ecosystem. A value in CXX divided by its CXX multiplier expresses the value in the chosen denomination (face value).

The system manages the balance between local truth (preserving the face value of contracts in their specified denomination) and global truth (adjusting all values relative to credcoin) through the daily rate and value adjustments in the DCO.

## License

You are welcome to explore, experiment with, and build upon this work for research, development, modeling, testing, demonstrations, and other non-commercial purposes. You are also very welcome to contribute.

However, you do not have permission to use this software to track real outstanding debts. The use of this credex software in any production environment is strictly prohibited. You may not deploy this software to be used by real users who represent different economic interests. Data of real past transactions may be used, but only as modeling, testing, or research input. If you want to transact real value with credex, you are invited to use the live shared ledger of the credex ecosystem at [mycredex.app](https://mycredex.app). This software is shared for research, development, and economic modeling purposes.

If you create something new based on this project, you must use the same license terms and give appropriate credit to the original work. You may not sell the software or any product or service that substantially relies on its functionality, except functionality deployed in the live credex ecosystem that all members can access, which is where its real power lies.

This approach allows for community engagement and experimentation while ensuring the integrity and unity of the system as a single shared economic network that all can access and benefit from.

## Neo4j Databases

Credex-core runs on two neo4j databases. LedgerSpace is the shared ledger containing the full state of the credex ecosystem. SearchSpace contains only unredeemed credexes, and is optimized to find credloops. On every credloop found and cleared, ledgerSpace is updated accordingly.

## Express.js Server

The express.js server is initialized in `src/index.ts`, which provides the cronjobs and endpoints that power the ecosystem and enable members and client apps to interact with its ledger.

### Cronjobs

The src/core-cron/ module hosts the cronjobs:

- DailyCredcoinOffering() runs every day at midnight UTC, calculating the value of 1 CXX and updating all ecosystem values accordingly.
- MinuteTransactionQueue() runs every minute, clearing credloops of value creation across the ecosystem.

### Endpoints

Endpoints and routes are deployed for the modules: Member, Account, Avatar, Credex, and AdminDashboard. Endpoints for the Dev module are included in development and staging deployments, but not in production.

## Developer Guides
- [Configure and Run Development Servers](/docs/develop/dev_env_setup.md)
- [Security and Authentication](docs/Security_and_Authentication.md)
- [Logging Best Practices](docs/logging_best_practices.md)
- [Security Overview](docs/security.md)
- [Swagger API Documentation](docs/swagger.md)
- [Validation Specs](docs/auth/api_validation.md)

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