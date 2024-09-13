import { Denomination } from "../constants/denominations";
import logger from "../utils/logger";

/**
 * Formats a numerical amount according to the specified denomination.
 * @param amount - The numerical amount to format.
 * @param code - The denomination code.
 * @returns A formatted string representation of the amount.
 */
export const denomFormatter = (amount: number, code: string): string => {
  // Ensure amount is a finite number
  if (!isFinite(amount)) {
    logger.warn("Invalid amount provided to denomFormatter", { amount, code });
    amount = 0;
  }

  /**
   * Formats a currency amount with the specified precision and regionalization.
   * @param amount - The amount to format.
   * @param precision - The number of decimal places to round to.
   * @param regionalization - The locale string for number formatting.
   * @returns A formatted string representation of the amount.
   */
  const formatCurrencyAmount = (
    amount: number,
    precision: number,
    regionalization: string
  ): string => {
    return new Intl.NumberFormat(regionalization, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(amount);
  };

  const getDenominations = (options: { code: string }): Denomination[] => {
    // This function needs to be imported from denominations.ts
    // For now, we'll just return a mock implementation
    return [
      {
        code,
        regionalization: "en-US",
        fulldescription: "",
        sourceForRate: "",
      },
    ];
  };

  const denomData = getDenominations({ code });
  const regionalization =
    denomData.length > 0 ? denomData[0].regionalization : "en-US";

  let precision: number;
  switch (code) {
    case "CXX":
      precision = 3;
      break;
    case "XAU":
      precision = 4;
      break;
    default:
      precision = 2;
  }

  const formattedAmount = formatCurrencyAmount(
    amount,
    precision,
    regionalization
  );
  logger.debug("Amount formatted", { amount, code, formattedAmount });
  return formattedAmount;
};
