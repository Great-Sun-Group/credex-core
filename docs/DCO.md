# Daily Credcoin Offering (DCO)

The Daily Credcoin Offering (DCO) is a crucial component of the Credex ecosystem that runs every 24 hours at midnight UTC, while most of the world's population centres are in darkness.

The DCO checks for an active daynode as a proxy for an active or empty database, and if no daynode exists the `DBinitialization` function is called. Then the script calls `DCOexecute`.

## DBinitialization.ts

The DBinitialization file sets up the initial state of the database for the Credex ecosystem.

1. Sets up database constraints and indexes for various entities (Daynode, Member, Account).
2. Establishes "day zero" and initializes exchange rates for various currencies against CXX (Credcoin).
3. Creates an initial "daynode" with the day zero exchange rates.
4. Creates three initial members and updates their member tiers.
5. Creates initial accounts including for the Credex Foundation and secured credex issuance for participation in the first DCO.
1. Establishes relationships between these accounts, particularly marking some as "CREDEX_FOUNDATION_AUDITED" to determine which accounts can originally issue secured credexes.
2. Creates an initial Credex transaction to fund the DCO for a year.

This initialization process sets up the basic structure and relationships needed for the Credex ecosystem to function, including the establishment of exchange rates and the creation of foundational accounts and transactions.

## DCOexecute.ts

The DCOexecute function implements the Daily Credcoin Offering (DCO) process.

1. Check if the Minute Transaction Queue (MTQ) is running and wait if it is and retry in a few seconds.
2. Set the DCOrunningNow flag and fetch the current and next date.
3. Perform an end-of-day backup.
4. Process defaulting unsecured credexes and expire pending offers/requests.
5. Fetch current exchange rates for various currencies.
6. Fetch declared DCO participants and filter them based on available secured balance.
7. Calculate new CXX (Credcoin) rates based on the total DCO amount and number of participants.
8. Create a new daynode with the updated CXX rates.
9. Create DCO give transactions from participants to the Credex Foundation.
10. Update credex and asset balances across the system to reflect the new exchange rates.
11. Create DCO receive transactions from the Credex Foundation to participants.
12. Perform a start-of-day backup for the new day.

This process implements the Credcoin Principle by:

- Allowing participants to contribute value to the ecosystem (DCO give transactions).
- Distributing an equal share of the new value to all participants (DCO receive transactions).
- Adjusting the value of Credcoin relative to other currencies based on the total contribution and number of participants.
- Updating all existing balances and transactions to maintain their relative value in the new exchange rate environment.

The DCO process ensures that the value of one Credcoin is always equal to the number of participants divided by the value of natural wealth entering the organic economy through the DCO, as stated in the Credcoin Principle.

This implementation allows for a dynamic, daily adjustment of the ecosystem's internal economy, reflecting the contributions and participation of its members while maintaining the relative value of existing transactions and balances.

**update the above to include DCOavatars and fetchZwGRate perhaps with their own sections**

# Exchange Rate Calculation Explanations for DCOexecute.ts

## processDCOParticipants function

1. **denomsInXAU**: Calculates exchange rates for all denominations in terms of XAU (gold).
   This standardizes all rates to a common base (gold) for easier comparison and calculation.
   ```
   Formula: denomsInXAU[currency] = USDbaseRates[currency] / USDbaseRates.XAU
   ```

2. **DCOinXAU calculation**:
   Converts each participant's contribution to XAU for a common measure.
   ```
   Formula: DCOinXAU += DCOgiveInDenom / denomsInXAU[DCOdenom]
   ```

3. **nextCXXinXAU**:
   Calculates the new CXX value in terms of XAU. This represents the new gold peg of the new day's CXX, which is used to set it's relative value against all currency deonominations and assets.
   ```
   Formula: nextCXXinXAU = DCOinXAU / numberConfirmedParticipants
   ```

4. **CXXprior_CXXcurrent**:
   Calculates the ratio between the previous day's CXX and the current day's CXX.
   This ratio is used to adjust existing CXX balances.
   ```
   Formula: CXXprior_CXXcurrent = DCOinCXX / numberConfirmedParticipants
   ```

5. **newCXXrates**:
   Calculates new exchange rates for all denominations in terms of CXX.
   For each denomination:
   a. Take its XAU rate (denomsInXAU[denom])
   b. Divide by the new CXX-to-XAU rate (nextCXXinXAU)
   c. Invert the result to get CXX per denomination unit
   ```
   Formula: newCXXrates[denom] = 1 / (nextCXXinXAU * denomsInXAU[denom])
   ```

## updateCredexBalances function
**to be reviewed**

1. **CXX credexes** are adjusted by dividing all CXX amounts by CXXprior_CXXcurrent.
   This adjusts the CXX balances to the new CXX value.

These calculations ensure that all credexes and balances are properly adjusted
to reflect the new exchange rates after each Daily Credcoin Offering (DCO).