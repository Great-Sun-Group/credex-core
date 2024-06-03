const _ = require("lodash");

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
  options: DenomOptions,
): string | Denominations[] {
  var denominations: Denominations[] = [
    {
      code: "CXX",
      fulldescription: "CXX (Credcoin)",
      regionalization: "en-CA",
      sourceForRate: "DCO",
    },
    {
      code: "ARS",
      fulldescription: "ARS (Argentine Peso)",
      regionalization: "es-ar",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "AUD",
      fulldescription: "AUD (Australian Dollar)",
      regionalization: "en-au",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "BRL",
      fulldescription: "BRL (Brazilian Real)",
      regionalization: "pt-br",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "BTC",
      fulldescription: "BTC (Bitcoin)",
      regionalization: "en-us",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "CAD",
      fulldescription: "CAD (Canadian Dollars)",
      regionalization: "en-CA",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "CHF",
      fulldescription: "CHF (Swiss Franc)",
      regionalization: "de-ch",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "CNY",
      fulldescription: "CNY (Chinese Yuan Renmibi)",
      regionalization: "zh-cn",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "DKK",
      fulldescription: "DKK (Danish Krone)",
      regionalization: "da",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "EUR",
      fulldescription: "EUR (Euro)",
      regionalization: "en-EU",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "GBP",
      fulldescription: "GBP (Pound Sterling)",
      regionalization: "en-gb",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "HKD",
      fulldescription: "HKD (Hong Kong Dollar)",
      regionalization: "en-US",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "INR",
      fulldescription: "INR (Indian Rupee)",
      regionalization: "hi",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "JPY",
      fulldescription: "JPY (Japanese Yen)",
      regionalization: "ja",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "KRW",
      fulldescription: "KRW (South Korean Won)",
      regionalization: "ko",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "PLN",
      fulldescription: "PLN (Polish Zloty)",
      regionalization: "pl",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "MXN",
      fulldescription: "MXN (Mexican Peso)",
      regionalization: "es-mx",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "MYR",
      fulldescription: "MYR (Malaysian Ringgit)",
      regionalization: "ms",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "NOK",
      fulldescription: "NOK (Norwegian Krone)",
      regionalization: "no",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "NZD",
      fulldescription: "NZD (New Zealand Dollar)",
      regionalization: "en-nz",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "RUB",
      fulldescription: "RUB (Russian Ruble)",
      regionalization: "ru",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "SEK",
      fulldescription: "SEK (Swedish Krona)",
      regionalization: "sv",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "SGD",
      fulldescription: "SGD (Singapore Dollar)",
      regionalization: "en-US",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "THB",
      fulldescription: "THB (Thai Baht)",
      regionalization: "th",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "TRY",
      fulldescription: "TRY (Turkish Lira)",
      regionalization: "tr",
      sourceForRate: "OpenExchangeRates",
    },
    {
      code: "TWD",
      fulldescription: "TWD (New TAiwan Dollar)",
      regionalization: "zh-tw",
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
      code: "ZIG_RBZ",
      fulldescription: "ZIG (Zimbabwe Gold Official Rate)",
      regionalization: "en-CA",
      sourceForRate: "RBZ",
    },
  ];

  let returndata: Denominations[] = denominations;
  if (options.code) {
    returndata = _.filter(returndata, function (i: Denominations) {
      return i.code == options.code;
    });
  }
  if (options.sourceForRate) {
    returndata = _.filter(returndata, function (i: Denominations) {
      return i.sourceForRate == options.sourceForRate;
    });
  }
  if (options.formatAsList) {
    return returndata.map((x) => x.code).join(",");
  }
  return returndata;
}

export const denomFormatter = (amount: number, code: string) => {
  const formatCurrencyAmount = (
    amount: number,
    roundedTo: number,
    regionalization: string,
  ) => {
    const formatter = new Intl.NumberFormat(regionalization);
    const formatterResult = formatter.format(amount);
    const formattedWholeNumbers = formatterResult.toString().split(".")[0];
    const roundedAmount = amount.toFixed(roundedTo);
    const formattedDecimals = roundedAmount.toString().split(".")[1];
    return `${formattedWholeNumbers}.${formattedDecimals}`;
  };

  //get regionalization
  const denomData: any = getDenominations({ code: code });
  const regionalization = denomData[0].regionalization;

  let formattedAmount;
  switch (code) {
    case "CXX":
      formattedAmount = formatCurrencyAmount(amount, 3, regionalization);
      break;
    case "BTC":
      formattedAmount = formatCurrencyAmount(amount, 8, regionalization);
      break;
    case "XAU":
      formattedAmount = formatCurrencyAmount(amount, 4, regionalization);
      break;
    default:
      formattedAmount = formatCurrencyAmount(amount, 2, regionalization);
  }
  return formattedAmount;
};
