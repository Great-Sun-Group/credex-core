import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import logger from "../../../utils/logger";

interface BalanceData {
  securedNetBalancesByDenom: string[];
  unsecuredBalancesInDefaultDenom: {
    totalPayables: string;
    totalReceivables: string;
    netPayRec: string;
  };
  netCredexAssetsInDefaultDenom: string;
}

class AccountError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AccountError';
  }
}

/**
 * GetBalancesService
 * 
 * This service retrieves the secured and unsecured balances for an account,
 * including net balances by denomination and total assets in default denomination.
 * 
 * @param accountID - The ID of the account to get balances for
 * @param requestId - The ID of the HTTP request
 * @returns Object containing secured and unsecured balance information
 * @throws AccountError with specific error codes
 */
export async function GetBalancesService(
  accountID: string,
  requestId: string
): Promise<BalanceData> {
  logger.debug("Entering GetBalancesService", { accountID, requestId });

  if (!accountID) {
    throw new AccountError("Missing required accountID", "INVALID_PARAMS");
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Fetching secured balances", { accountID, requestId });
    const getSecuredBalancesQuery = await ledgerSpaceSession.executeRead(async (tx) => {
      return tx.run(
        `
        MATCH (account:Account {accountID: $accountID})

        // Get all unique denominations from Credex nodes related to the account
        OPTIONAL MATCH (account)-[:OWES|OFFERED]-(securedCredex:Credex)<-[:SECURES]-()
        WITH DISTINCT securedCredex.Denomination AS denom, account

        // Aggregate incoming secured amounts for each denomination ensuring uniqueness
        OPTIONAL MATCH (account)<-[:OWES]-(inSecuredCredex:Credex {Denomination: denom})<-[:SECURES]-()
        WITH denom, account, 
            collect(DISTINCT inSecuredCredex) AS inSecuredCredexes

        // Aggregate outgoing secured amounts for each denomination ensuring uniqueness
        OPTIONAL MATCH (account)-[:OWES|OFFERED]->(outSecuredCredex:Credex {Denomination: denom})<-[:SECURES]-()
        WITH denom, 
            reduce(s = 0, n IN inSecuredCredexes | s + n.OutstandingAmount) AS sumSecuredIn, 
            collect(DISTINCT outSecuredCredex) AS outSecuredCredexes

        // Calculate the total outgoing amount
        WITH denom, sumSecuredIn, 
            reduce(s = 0, n IN outSecuredCredexes | s + n.OutstandingAmount) AS sumSecuredOut

        // Get the current day node which should have active status
        MATCH (daynode:Daynode {Active: true})

        // Calculate the net secured balance for each denomination and return the result
        RETURN denom, (sumSecuredIn - sumSecuredOut) / daynode[denom] AS netSecured
        `,
        { accountID }
      );
    });

    logger.debug("Processing secured balances", { accountID, requestId });
    const securedNetBalancesByDenom: string[] = getSecuredBalancesQuery.records
      .filter((record) => {
        const amount = record.get("netSecured");
        return typeof amount === "number" && isFinite(amount) && amount !== 0;
      })
      .map((record) => {
        const denom = record.get("denom");
        const amount = record.get("netSecured");
        return `${denomFormatter(amount, denom)} ${denom}`;
      });

    logger.debug("Fetching unsecured balances and total assets", { accountID, requestId });
    const getUnsecuredBalancesAndTotalAssetsQuery = await ledgerSpaceSession.executeRead(async (tx) => {
      return tx.run(
        `
        MATCH (account:Account{accountID:$accountID})

        OPTIONAL MATCH (account)<-[:OWES]-(owesInCredexUnsecured:Credex)
        WHERE NOT (owesInCredexUnsecured)<-[:SECURES]-()
        WITH account, COLLECT(DISTINCT owesInCredexUnsecured) AS unsecuredCredexesIn

        OPTIONAL MATCH (account)-[:OWES]->(owesOutCredexUnsecured:Credex)
        WHERE NOT (owesOutCredexUnsecured)<-[:SECURES]-()
        WITH account, unsecuredCredexesIn, COLLECT(DISTINCT owesOutCredexUnsecured) AS unsecuredCredexesOut

        OPTIONAL MATCH (account)<-[:OWES]-(owesInCredexAll:Credex)
        WITH account, unsecuredCredexesIn, unsecuredCredexesOut, COLLECT(DISTINCT owesInCredexAll) AS owesInCredexesAll

        OPTIONAL MATCH (account)-[:OWES]->(owesOutCredexAll:Credex)
        WITH account, unsecuredCredexesIn, unsecuredCredexesOut, owesInCredexesAll, COLLECT(DISTINCT owesOutCredexAll) AS owesOutCredexesAll

        WITH
          account.defaultDenom AS defaultDenom,
          REDUCE(total = 0, credex IN unsecuredCredexesIn | total + credex.OutstandingAmount) AS receivablesTotalCXX,
          REDUCE(total = 0, credex IN unsecuredCredexesOut | total + credex.OutstandingAmount) AS payablesTotalCXX,
          REDUCE(total = 0, credex IN unsecuredCredexesIn | total + credex.OutstandingAmount)
            - REDUCE(total = 0, credex IN unsecuredCredexesOut | total + credex.OutstandingAmount) AS unsecuredNetCXX,
          REDUCE(total = 0, credex IN owesInCredexesAll | total + credex.OutstandingAmount)
            - REDUCE(total = 0, credex IN owesOutCredexesAll | total + credex.OutstandingAmount) AS netCredexAssetsCXX
        MATCH (daynode:Daynode{Active:true})
        RETURN
          defaultDenom,
          receivablesTotalCXX / daynode[defaultDenom] AS receivablesTotalInDefaultDenom,
          payablesTotalCXX / daynode[defaultDenom] AS payablesTotalInDefaultDenom,
          unsecuredNetCXX / daynode[defaultDenom] AS unsecuredNetInDefaultDenom,
          netCredexAssetsCXX / daynode[defaultDenom] AS netCredexAssetsInDefaultDenom
        `,
        { accountID }
      );
    });

    if (getUnsecuredBalancesAndTotalAssetsQuery.records.length === 0) {
      throw new AccountError("Account not found", "NOT_FOUND");
    }

    logger.debug("Processing unsecured balances and total assets", { accountID, requestId });
    const unsecuredBalancesAndTotalAssets = getUnsecuredBalancesAndTotalAssetsQuery.records[0];
    const defaultDenom = unsecuredBalancesAndTotalAssets.get("defaultDenom");

    if (!defaultDenom) {
      throw new AccountError("Account missing default denomination", "INVALID_ACCOUNT_STATE");
    }

    const unsecuredBalancesInDefaultDenom = {
      totalPayables: `${denomFormatter(
        unsecuredBalancesAndTotalAssets.get("payablesTotalInDefaultDenom"),
        defaultDenom
      )} ${defaultDenom}`,
      totalReceivables: `${denomFormatter(
        unsecuredBalancesAndTotalAssets.get("receivablesTotalInDefaultDenom"),
        defaultDenom
      )} ${defaultDenom}`,
      netPayRec: `${denomFormatter(
        unsecuredBalancesAndTotalAssets.get("unsecuredNetInDefaultDenom"),
        defaultDenom
      )} ${defaultDenom}`,
    };

    const result: BalanceData = {
      securedNetBalancesByDenom,
      unsecuredBalancesInDefaultDenom,
      netCredexAssetsInDefaultDenom: `${denomFormatter(
        unsecuredBalancesAndTotalAssets.get("netCredexAssetsInDefaultDenom"),
        defaultDenom
      )} ${defaultDenom}`,
    };

    logger.info("Balances retrieved successfully", { accountID, requestId });
    logger.debug("Exiting GetBalancesService", { accountID, requestId });
    return result;

  } catch (error) {
    if (error instanceof AccountError) {
      throw error;
    }

    logger.error("Unexpected error in GetBalancesService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountID,
      requestId
    });

    throw new AccountError(
      `Failed to retrieve balances: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
  }
}
