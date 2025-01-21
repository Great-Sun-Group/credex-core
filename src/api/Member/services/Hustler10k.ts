import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { GetAccountByHandleService } from "../../Account/services/GetAccountByHandle";
import { GetMemberByHandleService } from "./GetMemberByHandle";
import { CreateCredexService } from "../../Credex/services/CreateCredex";
import { AcceptCredexService } from "../../Credex/services/AcceptCredex";
import logger from "../../../utils/logger";

interface Hustler10kData {
  credexID: string;
  newTier: number;
}

interface Hustler10kResult {
  success: boolean;
  data?: Hustler10kData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * Hustler10kService
 *
 * Handles the Hustler 10k program enrollment process:
 * 1. Gets greatsun_ops accountID using GetAccountByHandleService
 * 2. Creates a secured Credex from personal account to greatsun_ops
 * 3. Auto-accepts the offer on behalf of greatsun_ops
 * 4. Updates member tier to 3
 *
 * @param memberID - ID of the member enrolling
 * @param personalAccountID - ID of the member's personal account
 * @returns Hustler10kResult containing credexID and new tier level
 */
export async function Hustler10kService(
  memberID: string,
  personalAccountID: string
): Promise<Hustler10kResult> {
  logger.info("Entering Hustler10kService", { memberID, personalAccountID });

  if (!memberID || !personalAccountID) {
    return {
      success: false,
      message: "Missing required parameters",
      error: {
        code: "MISSING_PARAMS",
        details: "memberID and personalAccountID are required",
      },
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Get greatsun_ops account and member IDs
    logger.info("Getting greatsun_ops account and member...");
    const [greatsunAccountResult, greatsunSignerResult] = await Promise.all([
      GetAccountByHandleService("greatsun_ops"),
      GetMemberByHandleService("263778177125")
    ]);

    if (!greatsunAccountResult.success || !greatsunAccountResult.data) {
      logger.error("Failed to get greatsun_ops account", {
        error: greatsunAccountResult.error,
        memberID,
      });
      return {
        success: false,
        message: "Failed to get greatsun_ops account",
        error: {
          code: "GREATSUN_ACCOUNT_NOT_FOUND",
          details: "Could not find greatsun_ops account",
        },
      };
    }

    if (!greatsunSignerResult.success || !greatsunSignerResult.data) {
      logger.error("Failed to get greatsun_ops signer", {
        error: greatsunSignerResult.error,
        memberID,
      });
      return {
        success: false,
        message: "Failed to get greatsun_ops signer",
        error: {
          code: "GREATSUN_MEMBER_NOT_FOUND",
          details: "Could not find greatsun_ops signer",
        },
      };
    }

    logger.info("Found greatsun_ops account and signer", {
      accountID: greatsunAccountResult.data.accountID,
      memberID: greatsunSignerResult.data.memberID,
    });

    logger.info("Creating secured Credex offer...");
    // Create secured Credex offer
    const credexResult = await CreateCredexService({
      signerID: memberID,
      issuerAccountID: personalAccountID,
      receiverAccountID: greatsunAccountResult.data.accountID,
      InitialAmount: 1.0,
      Denomination: "USD",
      credexType: "PURCHASE",
      OFFERSorREQUESTS: "OFFERS",
      securedCredex: true,
      requestId: `hustler10k-${Math.random().toString(36).substring(2)}`,
    });

    if (!credexResult.success || !credexResult.data) {
      logger.error("Failed to create Credex offer", {
        error: credexResult.error,
        memberID,
        personalAccountID,
      });
      return {
        success: false,
        message: "Failed to create Credex offer",
        error: {
          code: "CREDEX_CREATE_FAILED",
          details: credexResult.error?.details || "Failed to create Credex offer",
        },
      };
    }

    logger.info("Accepting Credex offer...");
    // Accept offer on behalf of greatsun_ops
    const acceptResult = await AcceptCredexService(
      credexResult.data.credexID,
      greatsunSignerResult.data.memberID,
      memberID // requestId
    );

    if (!acceptResult.success) {
      logger.error("Failed to accept Credex offer", {
        error: acceptResult.error,
        memberID,
        credexID: credexResult.data.credexID,
      });
      return {
        success: false,
        message: "Failed to accept Credex offer",
        error: {
          code: "CREDEX_ACCEPT_FAILED",
          details: acceptResult.error?.details || "Failed to accept Credex offer",
        },
      };
    }

    logger.info("Updating member tier...");
    // Update member tier to 3
    const updateResult = await ledgerSpaceSession.executeWrite(async (tx) => {
      const query = `
        MATCH (member:Member { memberID: $memberID })
        SET member.memberTier = 3
        RETURN member.memberTier as newTier
      `;

      const result = await tx.run(query, { memberID });
      return result.records[0]?.get("newTier");
    });

    if (!updateResult) {
      logger.error("Failed to update member tier", { memberID });
      return {
        success: false,
        message: "Failed to update member tier",
        error: {
          code: "TIER_UPDATE_FAILED",
          details: "Could not update member tier",
        },
      };
    }

    logger.info("Hustler 10k enrollment completed", {
      memberID,
      credexID: credexResult.data.credexID,
      newTier: updateResult.toNumber(),
    });

    return {
      success: true,
      data: {
        credexID: credexResult.data.credexID,
        newTier: updateResult.toNumber(),
      },
      message: "Successfully enrolled in Hustler 10k program",
    };
  } catch (error) {
    logger.error("Error in Hustler10kService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberID,
      personalAccountID,
    });

    return {
      success: false,
      message: "Failed to process Hustler 10k enrollment",
      error: {
        code: "INTERNAL_ERROR",
        details:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting Hustler10kService", { memberID });
  }
}
