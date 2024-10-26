# The Credex Ecosystem

The credex ecosystem is a shared ledger that enables the efficient circulation of value, accumulation of capital, investment of profits, and giving of gifts.

Credex is a tool for financial inclusion, financial empowerment, and financial sovereignty. This credex-core API is the portal through which members access their sovereign financial rights, and sidestep the economic distortions and extortions imposed by obsolete and destructive monetary paradigms.

[mycredex.app](https://mycredex.app)

## Developer Guides

For a full overview and links to all development and deployment guides, see the complete [Developer Documentation](docs/README.md). If you are not working directly with Great Sun Group, make sure to also view the [license](#license) below.

Important commands and features for development of the credex-core API itself are listed in the [API Dev Reference](docs/developerAPI/README.md).

Developing a client app that queries the credex-core API? See the [Client Dev Reference](docs/developerClient/README.md).

## Credex Principle

**If I owe you,**\
**and you owe them,**\
**and they owe me,**\
**we're square.**

The credex ecosystem actualizes the Credex Principle in the Minute Transaction Queue (MTQ), which tracks payable and receivable invoices for members' accounts, finds loops of value creation, and cancels payable and receivable invoices against each other in "credloops" in which every debt is reduced by an equal value. This is a GAAP-compliant accounting procedure that anyone and any business can benefit from.

In accounting terms, an outstanding credex is a contingent asset for one party and a contingent liability for the other. These asset/liability pairs are automatically strung together into credloops wherever possible across the credex ecosystem. When a credloop is found and cleared, every account in the loop will have an accounts payable invoice cancelled against an equivalent accounts receivable invoice.

This behaviour enables members to replace the use of third party money or other debt instruments that are issued by an outside sovereign with accounting entries on a shared ledger that are backed only by the credit, assets, and value-producing capacities of the transacting members.

### Credex Services
The credex ecosystem provides the non-sovereign and non-monetary services of:
1. Verifying the identify of the sovereign counterparties and their corporations.
2. Managing the technical verification and standardization of the credex transaction contract between the counterparties by providing templates that include conditions for fulfillment, default, and other states, and actions executed on each condition or state change.
3. Executing these credex smart contracts according to the terms agreed by the counterparties, including triggering the agreed follow on actions dependent on the contract state and outcome.

These credex services empower a first layer of distributed financial sovereignty by enabling members to issue their own smart contracts. In so doing, we replace our reliance on the currencies of outside sovereigns and give ourselves options that insulate us from the financial dislocations of inflation and deflation in those currencies.

## Credcoin Principle

**Every human is entitled to one equal share of the value of the natural wealth entering the organic economy.**\
**Every human is responsible to provide value equal to the amount of natural wealth that they consume.**

The credex ecosystem actualizes the Credcoin Principle in the Daily Credcoin Offering (DCO), which updates exchange rates across the ecosystem daily. Every 24h, the DCO makes this equation true: one credcoin today equals the number of members participating in the DCO today divided by the value of natural wealth entering the organic economy through the DCO today.

The organic economy is a subset of the credex ecosystem, which is a subset of the global economy, which is the human-enhanced subset of the world that is given to us by nature. The organic economy is an economy in which wealth circulates, profit accumulates, investment is made, and gifts are given in alignment and long-term harmony with the biological environment of our habitat, the physical laws of our universe, and the spiritual laws of our existence.

The credex ecosystem stores values in credcoin (CXX). In order to natively enable multi-denominational accounting, a CXXmultiplier value is stored alongside every CXX value. Both of these values are updated in every DCO so that the credex remains true both to the face value in the denomination specified, and to other values stored in the ecosystem. A value expressed in CXX represents that value in relationship to every other value stored in the ecosystem, expressed in today's value of credcoin. A value in CXX divided by its CXX multiplier expresses the value in the chosen denomination (face value).

The credex ecosystem uses the flows of value that are created by members participating in the DCO as the anchor point for exchange rates across the ecosystem. These flows provide a daily peg that connects financial reality in the oganic economy and the credex ecosystem as a whole to the reality of underlying natural resource flows, in a way that all other economic values can orient on. This mechanism manages the balance between local truth (preserving the face value of credex contracts in their specified denomination) and global truth (adjusting all values relative to credcoin) through the daily rate and value adjustments in the DCO.

### Credcoin Services

The credex ecosystem provides the non-sovereign and non-monetary services of:
1. Processing and distributing the daily flows of value that actualize the entitlements and responsibilities of the Credex Principle for participating sovereign members.
2. Setting the relative values (exchange rates) of denominations in the ecosystem daily based on global market data including the real flows of value occuring in the DCO.

These credcoin services empower a second layer of distributed financial sovereignty by connecting every member to the underlying resource reality of their financial decisions, and relating every other measure of value all across the global economy to that underlying reality. In this way we replace our reliance on measures of value that are created and controlled by obsolete monetary paradigms with a measure of value that is structurally locked to the daily flows of real natural resources that sustain us.

## Ecosystem Services
While the credcoin services mathmatically lock all values in the the credex ecosystem to the market values of real natural resource flows, the credex services provide liquidity to meet all needs and fuel strong credit-based economic growth when conditions warrant, as determined by the distributed risk tolerance and risk/reward calculations of economic participants.

These non-sovereign and non-monetary services provided by the credex ecosystem establish a network protocol that enables financial sovereignty for all.

## License

You are welcome to explore, experiment with, and build upon this work within the purposes and exclusions below. If you fork this project or create something new based on this codebase, this license will automatically apply to all such work.

### Development and testing of apps connecting to the credex-core API

You are invited to use this codebase to run credex-core development servers so that you can develop apps that integrate with the live credex ecosystem. Any app built while using this codebase for development and testing remains solely the property of its developer(s) without limitation or restriction, including charging for their services at their own discretion, provided that all underlying data remains in the possesion of the member, stored in their credex account.

If necessary, an "App Store" type registration and code review process may be put in place for developers so that members will know they can trust 3rd party software. This review process will be free, minimal, and prompt. Its only purpose will be to ensure that member's data is being handled securely and stored appropriately.

Should any updates to the ecosystem codebase itself be required to facilitate the operation of a third-party app, requests will be welcomed. Please get in touch.

### Economic research and modeling

The credex-core software and connected neo4j databases have the power to model economic activity and circulation of value with 100% precision across large-scale networks of members and accounts. The scale at which it can model, and the associated computational costs, will soon be determined as we implement automated testing.

The use of this codebase for economic modeling is welcomed. Additions to the codebase that enhance its modeling capacity are also welcomed, provided they do not impact security. Forks from this codebase that reduce security in order to increase modeling ease or capacity are welcomed, provided they are shared publicly under these license terms.

### Development and testing of the credex-core API itself

Contributions, bug fixes, and security testing and patches are welcome. If you'd like to collaborate or contribute, please get in touch.

### EXCLUSION: Live ledger

**You do not have permission to use this software to track real outstanding debts.** You may not deploy this software to be used by real users transacting at arms length from each other. Data of real past transactions may be used, but only as modeling, testing, or research input. If you want to transact real value with credex, you are invited to use the live shared ledger of the credex ecosystem at [mycredex.app](https://mycredex.app), and to develop apps that connect your users to their credex accounts through `api.mycredex.app` as outlined in the welcomed uses above.

### Licensing Summary

This customized licensing approach ensures the integrity and unity of the credex ecosystem as a shared economic network that all can access and benefit from, while still encouraging community engagement and experimentation, economic research, and the development of interdependent software ecosystems that retain the option to self-fund and charge for their own software in whatever way they choose.
