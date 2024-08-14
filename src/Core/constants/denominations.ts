import { filter } from "lodash";

type DenomOptions = {
  code?: string;
  sourceForRate?: string;
  formatAsList?: boolean;
};

type Denominations = {
  code: string;
  fulldescription: string;
  regionalization: string;
  sourceForRate: string;
};

export function getDenominations(
  options: DenomOptions
): string | Denominations[] {
  const denominations: Denominations[] = [
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

  let returndata: Denominations[] = denominations;
  if (options.code) {
    returndata = filter(
      returndata,
      (i: Denominations) => i.code === options.code
    );
  }
  if (options.sourceForRate) {
    returndata = filter(
      returndata,
      (i: Denominations) => i.sourceForRate === options.sourceForRate
    );
  }
  if (options.formatAsList) {
    return returndata.map((x) => x.code).join(",");
  }
  return returndata;
}

export const denomFormatter = (amount: number, code: string): string => {
  // Ensure amount is a finite number
  if (!isFinite(amount)) {
    amount = 0;
  }

  // Function to format currency amounts
  const formatCurrencyAmount = (
    amount: number,
    roundedTo: number,
    regionalization: string
  ): string => {
    const roundedAmount =
      Math.round(amount * Math.pow(10, roundedTo)) / Math.pow(10, roundedTo);
    const formatter = new Intl.NumberFormat(regionalization);
    return formatter.format(roundedAmount);
  };

  const denomData: any = getDenominations({ code });
  const regionalization =
    denomData && denomData.length > 0 ? denomData[0].regionalization : "en-US";

  let formattedAmount;
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
