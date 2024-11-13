import { logInfo } from "../../../utils/logger";
import { Rates } from "./types";

/**
 * Updates credex and asset balances across both ledger and search spaces
 */
export async function updateCredexBalances(
  ledgerSession: any,
  searchSession: any,
  newCXXrates: Rates,
  CXXprior_CXXcurrent: number
): Promise<void> {
  logInfo("Updating credex and asset balances", {
    CXXprior_CXXcurrent,
    newCXXrates,
  });

  // Update ledger space
  await ledgerSession.run(`
    MATCH (newDaynode:Daynode {Active: TRUE})

    // Update CXX credexes
    MATCH (credcoinCredex:Credex)
    WHERE credcoinCredex.Denomination = "CXX"
    SET 
      credcoinCredex.InitialAmount = credcoinCredex.InitialAmount / newDaynode.CXXprior_CXXcurrent,
      credcoinCredex.OutstandingAmount = credcoinCredex.OutstandingAmount / newDaynode.CXXprior_CXXcurrent,
      credcoinCredex.RedeemedAmount = credcoinCredex.RedeemedAmount / newDaynode.CXXprior_CXXcurrent,
      credcoinCredex.DefaultedAmount = credcoinCredex.DefaultedAmount / newDaynode.CXXprior_CXXcurrent,
      credcoinCredex.WrittenOffAmount = credcoinCredex.WrittenOffAmount / newDaynode.CXXprior_CXXcurrent
    WITH newDaynode

    // Update currency credexes
    MATCH (currencyCredex:Credex)
    WHERE currencyCredex.Denomination <> "CXX"
    SET
      currencyCredex.InitialAmount = (currencyCredex.InitialAmount / currencyCredex.CXXmultiplier) * newDaynode[currencyCredex.Denomination],
      currencyCredex.OutstandingAmount = (currencyCredex.OutstandingAmount / currencyCredex.CXXmultiplier) * newDaynode[currencyCredex.Denomination],
      currencyCredex.RedeemedAmount = (currencyCredex.RedeemedAmount / currencyCredex.CXXmultiplier) * newDaynode[currencyCredex.Denomination],
      currencyCredex.DefaultedAmount = (currencyCredex.DefaultedAmount / currencyCredex.CXXmultiplier) * newDaynode[currencyCredex.Denomination],
      currencyCredex.WrittenOffAmount = (currencyCredex.WrittenOffAmount / currencyCredex.CXXmultiplier) * newDaynode[currencyCredex.Denomination],
      currencyCredex.CXXmultiplier = newDaynode[currencyCredex.Denomination]
    WITH newDaynode

    // Update CXX :REDEEMED relationships
    MATCH ()-[CXXredeemed:REDEEMED]-()
    WHERE CXXredeemed.Denomination = "CXX"
    SET
      CXXredeemed.AmountRedeemed = CXXredeemed.AmountRedeemed / newDaynode.CXXprior_CXXcurrent,
      CXXredeemed.AmountOutstandingNow = CXXredeemed.AmountOutstandingNow / newDaynode.CXXprior_CXXcurrent
    WITH newDaynode

    // Update currency :REDEEMED relationships
    MATCH ()-[currencyRedeemed:REDEEMED]-()
    WHERE currencyRedeemed.Denomination <> "CXX"
    SET
      currencyRedeemed.AmountOutstandingNow = (currencyRedeemed.AmountOutstandingNow / currencyRedeemed.CXXmultiplier) * newDaynode[currencyRedeemed.Denomination],
      currencyRedeemed.AmountRedeemed = (currencyRedeemed.AmountRedeemed / currencyRedeemed.CXXmultiplier) * newDaynode[currencyRedeemed.Denomination],
      currencyRedeemed.CXXmultiplier = newDaynode[currencyRedeemed.Denomination]
    WITH newDaynode

    // Update CXX :CREDLOOP relationships
    MATCH ()-[CXXcredloop:CREDLOOP]-()
    WHERE CXXcredloop.Denomination = "CXX"
    SET
      CXXcredloop.AmountRedeemed = CXXcredloop.AmountRedeemed / newDaynode.CXXprior_CXXcurrent,
      CXXcredloop.AmountOutstandingNow = CXXcredloop.AmountOutstandingNow / newDaynode.CXXprior_CXXcurrent
    WITH newDaynode

    // Update currency :CREDLOOP relationships
    MATCH ()-[currencyCredloop:CREDLOOP]-()
    WHERE currencyCredloop.Denomination <> "CXX"
    SET
      currencyCredloop.AmountOutstandingNow = (currencyCredloop.AmountOutstandingNow / currencyCredloop.CXXmultiplier) * newDaynode[currencyCredloop.Denomination],
      currencyCredloop.AmountRedeemed = (currencyCredloop.AmountRedeemed / currencyCredloop.CXXmultiplier) * newDaynode[currencyCredloop.Denomination],
      currencyCredloop.CXXmultiplier = newDaynode[currencyCredloop.Denomination]
    WITH newDaynode

    // Update loop anchors (always CXX)
    MATCH (loopAnchors:LoopAnchor)
    SET
      loopAnchors.LoopedAmount = loopAnchors.LoopedAmount / newDaynode.CXXprior_CXXcurrent
  `);

  // Update search space
  await searchSession.run(
    `
    MATCH (credex:Credex)
    WHERE credex.Denomination = "CXX"
    SET credex.outstandingAmount = credex.outstandingAmount / $CXXprior_CXXcurrent
  `,
    { CXXprior_CXXcurrent }
  );

  await searchSession.run(
    `
    MATCH (credex:Credex)
    WHERE credex.Denomination <> "CXX"
    WITH credex, $newCXXrates AS rates
    SET credex.outstandingAmount = (credex.outstandingAmount / credex.CXXmultiplier) * coalesce(rates[credex.Denomination], 1),
        credex.CXXmultiplier = coalesce(rates[credex.Denomination], 1)
  `,
    { newCXXrates }
  );
}
