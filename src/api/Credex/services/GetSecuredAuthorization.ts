import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

interface SecuredAuthorizationData {
  securerID: string | null;
  securableAmountInDenom: number;
}

interface GetSecuredAuthorizationResult {
  success: boolean;
  data?: SecuredAuthorizationData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

class CredexError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CredexError';
  }
}

/**
 * GetSecuredAuthorizationService
 * 
 * Retrieves information about an account's secured balance and authorization status.
 * Checks if the account is CREDEX_FOUNDATION_AUDITED or has available secured balance.
 * 
 * @param issuerAccountID - The ID of the account to check secured authorization for
 * @param Denomination - The denomination to check secured balance in
 * @returns GetSecuredAuthorizationResult containing securer ID and securable amount
 * @throws CredexError with specific error codes
 */
export async function GetSecuredAuthorizationService(
  issuerAccountID: string,
  Denomination: string
): Promise<GetSecuredAuthorizationResult> {
  logger.debug("Entering GetSecuredAuthorizationService", {
    issuerAccountID,
    Denomination
  });

  if (!issuerAccountID || !Denomination) {
    return {
      success: false,
      message: "Missing required parameters",
      error: {
        code: "MISSING_PARAMS",
        details: "Both issuerAccountID and Denomination are required"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Check if issuer is CREDEX_FOUNDATION_AUDITED
    logger.debug("Checking if issuer is CREDEX_FOUNDATION_AUDITED", {
      issuerAccountID
    });

    const isFoundationAuditedQuery = await ledgerSpaceSession.executeRead(async (tx) => {
      return tx.run(
        `
        MATCH (issuer:Account { accountID: $issuerAccountID })
        OPTIONAL MATCH
          (issuer)<-[:CREDEX_FOUNDATION_AUDITED]-
          (credexFoundation:Account { accountType: "CREDEX_FOUNDATION" })
        RETURN
          issuer IS NOT NULL AS accountExists,
          credexFoundation IS NOT NULL AS isAudited
        `,
        { issuerAccountID }
      );
    });

    const record = isFoundationAuditedQuery.records[0];
    if (!record.get("accountExists")) {
      return {
        success: false,
        message: "Account not found",
        error: {
          code: "ACCOUNT_NOT_FOUND",
          details: "The specified account does not exist"
        }
      };
    }

    const isAudited = record.get("isAudited");

    // If the issuer is CREDEX_FOUNDATION_AUDITED, authorize for unlimited secured credex issuance
    if (isAudited) {
      logger.info("Issuer is CREDEX_FOUNDATION_AUDITED", {
        issuerAccountID,
        Denomination
      });

      return {
        success: true,
        data: {
          securerID: issuerAccountID,
          securableAmountInDenom: Infinity
        },
        message: "Account is CREDEX_FOUNDATION_AUDITED with unlimited secured credex authorization"
      };
    }

    // If issuer is not CREDEX_FOUNDATION_AUDITED, verify the available secured balance in denom
    logger.debug("Checking secured balance for non-CREDEX_FOUNDATION_AUDITED issuer", {
      issuerAccountID,
      Denomination
    });

    const getSecurableDataQuery = await ledgerSpaceSession.executeRead(async (tx) => {
      return tx.run(
        `
        MATCH (account:Account { accountID: $accountID })
        OPTIONAL MATCH (account)-[transactionType:OWES|OFFERS]-(credex:Credex)<-[:SECURES]-(securer:Account)
        WHERE credex.Denomination = $Denomination
        WITH
          securer.accountID AS securingAccountID,
          SUM(CASE 
            WHEN endNode(transactionType) = account THEN credex.OutstandingAmount 
            ELSE 0 
          END) -
          SUM(CASE 
            WHEN startNode(transactionType) = account THEN credex.OutstandingAmount 
            ELSE 0 
          END) AS netSecurablePerSecurerCXX
        WHERE securingAccountID IS NOT NULL
        MATCH (daynode:Daynode { Active: true })
        RETURN
          securingAccountID,
          netSecurablePerSecurerCXX / daynode[$Denomination] AS netSecurableInDenom
        ORDER BY netSecurableInDenom DESC
        LIMIT 1
        `,
        {
          accountID: issuerAccountID,
          Denomination
        }
      );
    });

    // If no secured balance found
    if (getSecurableDataQuery.records.length === 0) {
      logger.info("No secured balance found", {
        issuerAccountID,
        Denomination
      });

      return {
        success: true,
        data: {
          securerID: null,
          securableAmountInDenom: 0
        },
        message: "No secured balance available"
      };
    }

    const securableRecord = getSecurableDataQuery.records[0];
    const securerID = securableRecord.get("securingAccountID");
    const securableAmountInDenom = securableRecord.get("netSecurableInDenom");

    logger.info("Successfully retrieved secured authorization data", {
      issuerAccountID,
      Denomination,
      securerID,
      securableAmountInDenom
    });

    return {
      success: true,
      data: {
        securerID,
        securableAmountInDenom
      },
      message: `Available secured balance: ${securableAmountInDenom} ${Denomination}`
    };

  } catch (error) {
    logger.error("Error in GetSecuredAuthorizationService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      issuerAccountID,
      Denomination
    });

    return {
      success: false,
      message: "Failed to retrieve secured authorization data",
      error: {
        code: "DATABASE_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred while checking secured authorization"
      }
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting GetSecuredAuthorizationService", {
      issuerAccountID,
      Denomination
    });
  }
}
