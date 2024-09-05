
import { SecuredCredexAuthForTier } from "../services/SecuredCredexAuthForTier";
import logger from "../../../config/logger";

export async function SecuredCredexAuthForTierController(
  memberID: string,
  tier: number,
  Amount: number,
  Denomination: string
): Promise<{ isAuthorized: boolean; message: string }> {
  try {
    const result = await SecuredCredexAuthForTier(memberID, Amount, Denomination);
    if (typeof result === 'string') {
      return { isAuthorized: false, message: result };
    } else {
      return { isAuthorized: true, message: "Authorization successful" };
    }
  } catch (error) {
    logger.error("Error in SecuredCredexAuthForTierController:", error);
    return { isAuthorized: false, message: "Internal Server Error" };
  }
}
