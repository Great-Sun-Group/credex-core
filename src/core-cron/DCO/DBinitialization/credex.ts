import { CreateCredexService } from "../../../api/Credex/services/CreateCredex";
import { AcceptCredexService } from "../../../api/Credex/services/AcceptCredex";
import { ServiceResult } from "../../../types/apiResponse";
import { DCOCredexData } from "../DCOavatars/types";
import logger from "../../../utils/logger";

interface AcceptCredexData {
  credexID: string;
  acceptorAccountID: string;
  acceptorSignerID: string;
  acceptedAt: string;
  transactionType: string;
  amount: string;
  denomination: string;
  secured: boolean;
}

type AcceptCredexResult = ServiceResult<AcceptCredexData>;

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
    signerID: memberID,
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
  const createResult = await CreateCredexService(credexData);

  if (!createResult.success || !createResult.data) {
    logger.error("Failed to create initial Credex", { 
      requestId,
      error: createResult.message,
      details: createResult.error?.details
    });
    throw new Error(createResult.message);
  }

  const credexID = createResult.data.credexID;
  logger.info("Initial Credex offered successfully", {
    requestId,
    credexID,
  });

  logger.debug("Accepting initial Credex", {
    requestId,
    credexID,
    signerID: memberID,
  });

  try {
    const acceptResult = await AcceptCredexService(
      credexID,
      memberID,
      requestId
    );

    if (!acceptResult.success || !acceptResult.data) {
      logger.error("Failed to accept initial Credex", {
        requestId,
        credexID,
        error: acceptResult.message,
        details: acceptResult.error?.details
      });
      throw new Error(acceptResult.message);
    }

    logger.info("Initial Credex accepted successfully", {
      requestId,
      credexID: acceptResult.data.credexID,
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
