import { CreateCredexService } from "../../../api/Credex/services/CreateCredex";
import { AcceptCredexService } from "../../../api/Credex/services/AcceptCredex";
import logger from "../../../utils/logger";

interface CreateCredexResult {
  credex: {
    credexID: string;
    formattedInitialAmount: string;
    counterpartyAccountName: string;
    secured: boolean;
    dueDate?: string;
  } | boolean;
  message: string;
}

interface AcceptCredexResult {
  acceptedCredexID: string;
  acceptorAccountID: string;
  acceptorSignerID: string;
}

/**
 * Creates and accepts an initial Credex.
 */
export async function createInitialCredex(
  memberID: string,
  issuerAccountID: string,
  receiverAccountID: string,
  requestId: string
): Promise<void> {
  logger.info("Creating initial Credex for DBinitialization", { requestId });

  const credexData = {
    memberID,
    issuerAccountID,
    receiverAccountID,
    Denomination: "CAD",
    InitialAmount: 365, // fund DCO for a year with no adjustments
    credexType: "PURCHASE",
    OFFERSorREQUESTS: "OFFERS" as const,
    securedCredex: true,
    requestId,
  };

  logger.debug("Offering initial Credex", { requestId, credexData });
  const DCOinitializationCreateCredex = await CreateCredexService(credexData);

  if (!DCOinitializationCreateCredex.credex || typeof DCOinitializationCreateCredex.credex === "boolean") {
    logger.error("Invalid response from CreateCredexService", { requestId });
    throw new Error("Invalid response from CreateCredexService");
  }

  const credexID = DCOinitializationCreateCredex.credex.credexID;
  logger.info("Initial Credex offered successfully", {
    requestId,
    credexID,
  });

  logger.debug("Accepting initial Credex", {
    requestId,
    credexID,
    memberID,
  });

  try {
    const acceptResult = await AcceptCredexService(
      credexID,
      memberID,
      requestId
    );

    logger.info("Initial Credex accepted successfully", {
      requestId,
      credexID: acceptResult.acceptedCredexID,
    });

    logger.info("Initial Credex creation completed", { requestId });
  } catch (error) {
    logger.error("Failed to accept initial Credex", {
      requestId,
      credexID,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
