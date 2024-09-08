/*
returns information on a account's secured balance

required inputs:
  issuerAccountID,
  Denomination,

returns:
  securerID (null if no secured balances available or error)
  securableAmountInDenom (0 if no secured balances or error, infinity if CREDEX_FOUNDATION_AUDITED)
    
*/

import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { logDebug, logInfo, logWarning, logError } from "../../../utils/logger";

export async function GetSecuredAuthorizationService(
  issuerAccountID: string,
  Denomination: string
) {
  logDebug(`Entering GetSecuredAuthorizationService`, { issuerAccountID, Denomination });

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Check if issuer is CREDEX_FOUNDATION_AUDITED
    logDebug(`Checking if issuer is CREDEX_FOUNDATION_AUDITED`, { issuerAccountID });
    const isFoundationAuditedQuery = await ledgerSpaceSession.run(
      `
        OPTIONAL MATCH
          (issuer:Account { accountID: $issuerAccountID })
          <-[:CREDEX_FOUNDATION_AUDITED]-
          (credexFoundation:Account { accountType: "CREDEX_FOUNDATION" })
        RETURN issuer IS NOT NULL AS isAudited
      `,
      { issuerAccountID }
    );

    const record = isFoundationAuditedQuery.records[0];
    const isAudited = record ? record.get("isAudited") : false;

    // If the issuer is CREDEX_FOUNDATION_AUDITED, authorize for unlimited secured credex issuance
    if (isAudited) {
      logInfo(`Issuer is CREDEX_FOUNDATION_AUDITED, authorizing unlimited secured credex issuance`, { issuerAccountID });
      return {
        securerID: issuerAccountID,
        securableAmountInDenom: Infinity,
      };
    }

    // If issuer is not CREDEX_FOUNDATION_AUDITED, verify the available secured balance in denom
    logDebug(`Verifying available secured balance for non-CREDEX_FOUNDATION_AUDITED issuer`, { issuerAccountID, Denomination });
    const getSecurableDataQuery = await ledgerSpaceSession.run(
      `
        MATCH (account:Account {accountID: $accountID})
        OPTIONAL MATCH (account)-[transactionType:OWES|OFFERS]-(credex:Credex)<-[:SECURES]-(securer:Account)
        WHERE credex.Denomination = $Denomination
        WITH
          securer.accountID AS securingAccountID,
          SUM(CASE WHEN endNode(transactionType) = account THEN credex.OutstandingAmount ELSE 0 END) -
          SUM(CASE WHEN startNode(transactionType) = account THEN credex.OutstandingAmount ELSE 0 END)
          AS netSecurablePerSecurerCXX
        MATCH (daynode:Daynode {Active: true})
        RETURN
          securingAccountID,
          netSecurablePerSecurerCXX / daynode[$Denomination] AS netSecurableInDenom
          ORDER BY netSecurableInDenom DESC
          LIMIT 1
      `,
      {
        accountID: issuerAccountID,
        Denomination: Denomination,
      }
    );

    const securableRecord = getSecurableDataQuery.records[0];
    if (!securableRecord || securableRecord.length === 0) {
      logWarning(`No securable balance found for issuer`, { issuerAccountID, Denomination });
      return {
        securerID: null,
        securableAmountInDenom: 0,
      };
    }

    const result = {
      securerID: securableRecord.get("securingAccountID"),
      securableAmountInDenom: securableRecord.get("netSecurableInDenom"),
    };

    logInfo(`Successfully retrieved secured authorization data`, { issuerAccountID, Denomination, ...result });
    return result;
  } catch (error) {
    logError(`Error in GetSecuredAuthorizationService:`, error as Error, { issuerAccountID, Denomination });
    throw error;
  } finally {
    await ledgerSpaceSession.close();
    logDebug(`Exiting GetSecuredAuthorizationService`, { issuerAccountID, Denomination });
  }
}
