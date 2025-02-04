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

interface GetBalancesResult {
  success: boolean;
  data?: BalanceData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * GetBalancesService
 * 
 * This service retrieves the secured and unsecured balances for an account,
 * including net balances by denomination and total assets in default denomination.
 * 
 * @param accountID - The ID of the account to get balances for
 * @param requestId - The ID of the HTTP request
 * @returns GetBalancesResult containing balance information
 */
export async function GetBalancesService(
  accountID: string,
  requestId: string
): Promise<GetBalancesResult> {
  logger.debug("Entering GetBalancesService", { accountID, requestId });

  if (!accountID) {
    return {
      success: false,
      message: "Account ID is required",
      error: {
        code: "MISSING_ACCOUNT_ID",
        details: "The account ID parameter must be provided"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Fetching secured balances", { accountID, requestId });
    const getSecuredBalancesQuery = await ledgerSpaceSession.executeRead(async (tx) => {
      return tx.run(
        `
        MATCH (account:Account {accountID: $accountID})

        // Get all unique denominations from secured Credex nodes related to the account
        OPTIONAL MATCH (account)-[:OWES|OFFERS]-(securedCredex:Credex)<-[:SECURES]-()
        WITH DISTINCT securedCredex.Denomination AS denom, account

        // Aggregate incoming secured amounts - only count OWES as these are certain
        OPTIONAL MATCH (account)<-[:OWES]-(inSecuredCredex:Credex {Denomination: denom})<-[:SECURES]-()
        WITH denom, account, 
            collect(DISTINCT inSecuredCredex) AS inSecuredCredexes

        // Aggregate outgoing secured amounts - count both OWES and OFFERS to prevent over-commitment
        OPTIONAL MATCH (account)-[:OWES|OFFERS]->(outSecuredCredex:Credex {Denomination: denom})<-[:SECURES]-()
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
      return {
        success: false,
        message: "Account not found",
        error: {
          code: "ACCOUNT_NOT_FOUND",
          details: "The specified account does not exist"
        }
      };
    }

    logger.debug("Processing unsecured balances and total assets", { accountID, requestId });
    const unsecuredBalancesAndTotalAssets = getUnsecuredBalancesAndTotalAssetsQuery.records[0];
    const defaultDenom = unsecuredBalancesAndTotalAssets.get("defaultDenom");

    if (!defaultDenom) {
      return {
        success: false,
        message: "Account configuration error",
        error: {
          code: "MISSING_DEFAULT_DENOM",
          details: "The account is missing a default denomination setting"
        }
      };
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

    const balanceData: BalanceData = {
      securedNetBalancesByDenom,
      unsecuredBalancesInDefaultDenom,
      netCredexAssetsInDefaultDenom: `${denomFormatter(
        unsecuredBalancesAndTotalAssets.get("netCredexAssetsInDefaultDenom"),
        defaultDenom
      )} ${defaultDenom}`,
    };

    logger.info("Balances retrieved successfully", { accountID, requestId });
    
    return {
      success: true,
      data: balanceData,
      message: "Account balances retrieved successfully"
    };

  } catch (error) {
    logger.error("Error retrieving account balances", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountID,
      requestId
    });

    return {
      success: false,
      message: "Failed to retrieve account balances",
      error: {
        code: "DATABASE_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred while retrieving balances"
      }
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting GetBalancesService", { accountID, requestId });
  }
}
