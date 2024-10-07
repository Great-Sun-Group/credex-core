# Credex Ecosystem Core API

The credex ecosystem is a shared ledger that enables the efficient circulation of value, accumulation of capital, investment of profits, and giving of gifts. It is a tool for financial inclusion, financial empowerment, and financial sovereignty.

## Credex Principle

**If I owe you,**\
**and you owe them,**\
**and they owe me,**\
**we're square.**

The credex ecosystem actualizes the Credex Principle in the Minute Transaction Queue (MTQ), which tracks payable and receivable invoices for members' accounts, finds loops of value creation, and cancels payable and receivable invoices against each other in "credloops" in which every debt is reduced by an equal value. This is a GAAP-compliant accounting procedure that anyone and any business can benefit from.

In accounting terms, an outstanding credex is a contingent asset for one party and a contingent liability for the other. These asset/liability pairs are automatically strung together into credloops wherever possible across the credex ecosystem. When a credloop is found and cleared, every account in the loop will have an accounts payable invoice cancelled against an equivalent accounts receivable invoice.

This behaviour enables members to replace the use of third party money or debt instruments issued by an outside sovereign with accounting entries backed purely by the sovereign value-producing capacities of the transacting members.

The credex ecosystem provides the non-sovereign and non-monetary services of verifying the identify of the sovereign counterparties and their corporations, and managing the technical verification and standardization of the credex transaction contract between them.

## Credcoin Principle

**Every human is entitled to one equal share of the value of the natural wealth entering the organic economy.**\
**Every human is responsible to provide value equal to the amount of natural wealth that they consume.**

The ecosystem actualizes the Credcoin Principle in the Daily Credcoin Offering (DCO), which updates exchange rates across the ecosystem daily. Every 24h, the DCO makes this equation true: one credcoin today equals the number of members participating in the DCO today divided by the value of natural wealth entering the organic economy through the DCO today.

The organic economy is a subset of the credex ecosystem, which is a subset of the global economy, which is the human-enhanced subset of the world that is given to us by nature. The organic economy is an economy in which wealth circulates, profit accumulates, investment is made, and gifts are given in alignment and long-term harmony with the biological environment of our habitat and the physical laws that bind us.

The credex ecosystem stores values in credcoin (CXX). In order to natively enable multi-denominational accounting, a CXXmultiplier value is stored alongside every CXX value. Both of these values are updated in every DCO so that the credex remains true to the face value in the denomination specified, and to other values stored in the ecosystem. A value expressed in CXX represents that value in relationship to every other value stored in the ecosystem, expressed in today's value of credcoin. A value in CXX divided by its CXX multiplier expresses the value in the chosen denomination (face value).

The system manages the balance between local truth (preserving the face value of contracts in their specified denomination) and global truth (adjusting all values relative to credcoin) through the daily rate and value adjustments in the DCO.

## License

You are welcome to explore, experiment with, and build upon this work for research, development, modeling, testing, demonstrations, and other non-commercial purposes. You are also invited to contribute. If you create something new based on this project, you must use the same license terms and give appropriate credit to the original work.

You do not have permission to use this software to track real outstanding debts. You may not deploy this software to be used by real users transacting at arms length from each other. Data of real past transactions may be used, but only as modeling, testing, or research input. If you want to transact real value with credex, you are invited to use the live shared ledger of the credex ecosystem at [mycredex.app](https://mycredex.app), and to develop apps that connect your users to their credex accounts.

This approach allows for community engagement and experimentation while ensuring the integrity and unity of the system as a single shared economic network that all can access and benefit from.

## Neo4j Databases

Credex-core runs on two neo4j databases. LedgerSpace is the shared ledger containing the full state of the credex ecosystem. SearchSpace contains only unredeemed credexes, and is optimized to find credloops. On every credloop found and cleared, LedgerSpace is updated accordingly.

## Express.js Server

The express.js server is initialized in `src/index.ts`, which provides the cronjobs and endpoints that power the ecosystem and enable members and client apps to interact with its ledger.

### Cronjobs

The src/core-cron/ module hosts the cronjobs:

- DailyCredcoinOffering runs every day at midnight UTC, calculating the value of 1 CXX and updating all ecosystem values accordingly.
- MinuteTransactionQueue runs every minute, clearing credloops of value creation across the ecosystem.

### Endpoints

Endpoints and routes are deployed for the modules: Member, Account, Credex, Avatar, and AdminDashboard. Endpoints for the Dev module are included in development and staging deployments, but not in production.

## Developer Guides
- [Configure and Run Development Servers](/docs/develop/developers_guide.md)
- [Security and Authentication](docs/auth/Security_and_Authentication.md)
- [Logging Best Practices](docs/develop/logging_best_practices.md)
- [Swagger API Documentation](docs/develop/swagger.md)
- [Validation Specs](docs/auth/api_validation.md)

## Module Documentation

- [Daily Credcoin Offering (DCO)](<docs/module/Daily_Credcoin_Offering_(DCO).md>)
- [Minute Transaction Queue (MTQ)](<docs/module/MinuteTransactionQueue_(MTQ).md>)
- [Member](docs/module/Member.md)
- [Account](docs/module/Account.md)
- [Credex](docs/module/Credex.md)
- [Avatar](docs/module/Avatar.md)
- [AdminDashboard](docs/module/AdminDashboard.md)
- [Dev](docs/module/Dev.md) (doc doesn't yet exist)

## Schemas

- [ledgerSpace Schema](docs/databases/ledgerSpace_schema.md)
- [searchSpace Schema](docs/databases/searchSpace_schema.md)

## Deployment

- [Deployer's Guide](docs/deploy/deployers_guide.md)
