import { filter } from "lodash";

/**
 * Options for querying denominations.
 */
type DenomOptions = {
  code?: string;
  sourceForRate?: string;
  formatAsList?: boolean;
};

/**
 * Represents a currency denomination.
 */
export type Denomination = {
  code: string;
  fulldescription: string;
  regionalization: string;
  sourceForRate: string;
};

/**
 * Array of supported denominations in the Credex system.
 */
const denominations: Denomination[] = [
  {
    code: "CXX",
    fulldescription: "CXX (Credcoin)",
    regionalization: "en-CA",
    sourceForRate: "DCO",
  },
  {
    code: "CAD",
    fulldescription: "CAD (Canadian Dollars)",
    regionalization: "en-CA",
    sourceForRate: "OpenExchangeRates",
  },
  {
    code: "USD",
    fulldescription: "USD (United States Dollars)",
    regionalization: "en-US",
    sourceForRate: "OpenExchangeRates",
  },
  {
    code: "XAU",
    fulldescription: "XAU (Troy Gold Ounces)",
    regionalization: "en-CA",
    sourceForRate: "OpenExchangeRates",
  },
  {
    code: "ZIG",
    fulldescription: "ZIG (Zimbabwe Gold Official Rate)",
    regionalization: "en-CA",
    sourceForRate: "RBZ",
  },
];

/**
 * Retrieves denominations based on provided options.
 * @param options - Options for filtering denominations.
 * @returns An array of Denomination objects or a comma-separated string of denomination codes.
 */
export function getDenominations(
  options: DenomOptions
): string | Denomination[] {
  let result = denominations;

  if (options.code) {
    result = result.filter((denom) => denom.code === options.code);
  }

  if (options.sourceForRate) {
    result = result.filter(
      (denom) => denom.sourceForRate === options.sourceForRate
    );
  }

  if (options.formatAsList) {
    return result.map((denom) => denom.code).join(",");
  }

  return result;
}

/**
 * Formats a numerical amount according to the specified denomination.
 * @param amount - The numerical amount to format.
 * @param code - The denomination code.
 * @returns A formatted string representation of the amount.
 */
export const denomFormatter = (amount: number, code: string): string => {
  // Ensure amount is a finite number
  if (!isFinite(amount)) {
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
    const roundedAmount = Number(amount.toFixed(precision));
    return new Intl.NumberFormat(regionalization).format(roundedAmount);
  };

  const denomData = getDenominations({ code }) as Denomination[];
  const regionalization =
    denomData.length > 0 ? denomData[0].regionalization : "en-US";

  let formattedAmount: string;
  switch (code) {
    case "CXX":
      formattedAmount = formatCurrencyAmount(amount, 3, regionalization);
      break;
    case "XAU":
      formattedAmount = formatCurrencyAmount(amount, 4, regionalization);
      break;
    default:
      formattedAmount = formatCurrencyAmount(amount, 2, regionalization);
  }

  return formattedAmount;
};

/**
 * Retrieves the full description of a denomination by its code.
 * @param code - The denomination code.
 * @returns The full description of the denomination, or undefined if not found.
 */
export const getFullDescription = (code: string): string | undefined => {
  const denom = denominations.find((d) => d.code === code);
  return denom?.fulldescription;
};

/**
 * Checks if a given code is a valid denomination.
 * @param code - The denomination code to check.
 * @returns True if the code is a valid denomination, false otherwise.
 */
export const isValidDenomination = (code: string): boolean => {
  return denominations.some((d) => d.code === code);
};