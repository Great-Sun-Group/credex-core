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
 * Checks if the account is accountType=TRUST or has available secured balance.
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
    // Check if issuer is accountType=TRUST
    logger.debug("Checking if issuer is accountType=TRUST", {
      issuerAccountID,
    });

    const isTrustQuery = await ledgerSpaceSession.executeRead(async (tx) => {
      return tx.run(
        `
        MATCH (issuer:Account { accountID: $issuerAccountID })
        WHERE issuer.accountType = "TRUST"
        RETURN
          issuer IS NOT NULL AS isTrust
        `,
        { issuerAccountID }
      );
    });

    if (isTrustQuery.records[0]) {
      // If the issuer is isTrust, authorize for unlimited secured credex issuance
      logger.info("Issuer is Trust Account", {
        issuerAccountID,
        Denomination,
      });

      return {
        success: true,
        data: {
          securerID: issuerAccountID,
          securableAmountInDenom: Infinity,
        },
        message:
          "Account is accountType=TRUST with unlimited secured credex authorization",
      };
    }

    // If issuer is not accountType=TRUST, verify the available secured balance in denom
    logger.debug("Checking secured balance for non-TRUST issuer", {
      issuerAccountID,
      Denomination,
    });

    const getSecurableDataQuery = await ledgerSpaceSession.executeRead(
      async (tx) => {
        return tx.run(
          `
        MATCH (account:Account { accountID: $accountID })
        // First resolve incoming OWES amounts per securer
        OPTIONAL MATCH (account)<-[incomingType:OWES]-(credex1:Credex)<-[:SECURES]-(securer:Account)
        WHERE credex1.Denomination = $Denomination
        WITH account, securer.accountID as securingAccountID,
             COALESCE(SUM(credex1.OutstandingAmount), 0) as incomingAmount
        
        // Then handle outgoing OWES|OFFERS amounts for same securer
        OPTIONAL MATCH (account)-[outgoingType:OWES|OFFERS]->(credex2:Credex)<-[:SECURES]-(outSecurer:Account)
        WHERE credex2.Denomination = $Denomination 
          AND outSecurer.accountID = securingAccountID
        WITH securingAccountID, incomingAmount,
             COALESCE(SUM(credex2.OutstandingAmount), 0) as outgoingAmount
        
        // Finally calculate net amount
        WITH securingAccountID,
             incomingAmount - outgoingAmount AS netSecurablePerSecurerCXX
        WHERE securingAccountID IS NOT NULL
        MATCH (daynode:Daynode { Active: true })
        RETURN
          securingAccountID,
          ROUND(netSecurablePerSecurerCXX / daynode[$Denomination], 4) AS netSecurableInDenom
        ORDER BY netSecurableInDenom DESC
        LIMIT 1
        `,
          {
            accountID: issuerAccountID,
            Denomination,
          }
        );
      }
    );

    // If no secured balance found
    if (getSecurableDataQuery.records.length === 0) {
      logger.info("No secured balance found", {
        issuerAccountID,
        Denomination,
      });

      return {
        success: true,
        data: {
          securerID: null,
          securableAmountInDenom: 0,
        },
        message: "No secured balance available",
      };
    }

    const securableRecord = getSecurableDataQuery.records[0];
    const securerID = securableRecord.get("securingAccountID");
    const securableAmountInDenom = securableRecord.get("netSecurableInDenom");

    logger.info("Successfully retrieved secured authorization data", {
      issuerAccountID,
      Denomination,
      securerID,
      securableAmountInDenom,
    });

    return {
      success: true,
      data: {
        securerID,
        securableAmountInDenom,
      },
      message: `Available secured balance: ${securableAmountInDenom} ${Denomination}`,
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
