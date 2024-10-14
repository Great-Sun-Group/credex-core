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
   Calculates the new CXX value in terms of XAU. This represents the new "gold backing" of each CXX.
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

1. **CXX credexes** are adjusted by dividing all CXX amounts by CXXprior_CXXcurrent.
   This adjusts the CXX balances to the new CXX value.

2. **Currency credexes** are updated using the following steps:
   a. Convert the amount back to its original denomination using the old CXXmultiplier
   b. Apply the new CXX rate to get the updated CXX value
   ```
   Formula: newAmount = (oldAmount / oldCXXmultiplier) * newCXXrate[denomination]
   ```

These calculations ensure that all credexes and balances are properly adjusted
to reflect the new exchange rates after each Daily Credcoin Offering (DCO).