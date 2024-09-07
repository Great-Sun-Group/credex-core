"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidDenomination = exports.getFullDescription = exports.denomFormatter = void 0;
exports.getDenominations = getDenominations;
/**
 * Array of supported denominations in the Credex system.
 */
const denominations = [
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
function getDenominations(options) {
    let result = denominations;
    if (options.code) {
        result = result.filter((denom) => denom.code === options.code);
    }
    if (options.sourceForRate) {
        result = result.filter((denom) => denom.sourceForRate === options.sourceForRate);
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
const denomFormatter = (amount, code) => {
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
    const formatCurrencyAmount = (amount, precision, regionalization) => {
        const roundedAmount = Number(amount.toFixed(precision));
        return new Intl.NumberFormat(regionalization).format(roundedAmount);
    };
    const denomData = getDenominations({ code });
    const regionalization = denomData.length > 0 ? denomData[0].regionalization : "en-US";
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
exports.denomFormatter = denomFormatter;
/**
 * Retrieves the full description of a denomination by its code.
 * @param code - The denomination code.
 * @returns The full description of the denomination, or undefined if not found.
 */
const getFullDescription = (code) => {
    const denom = denominations.find((d) => d.code === code);
    return denom?.fulldescription;
};
exports.getFullDescription = getFullDescription;
/**
 * Checks if a given code is a valid denomination.
 * @param code - The denomination code to check.
 * @returns True if the code is a valid denomination, false otherwise.
 */
const isValidDenomination = (code) => {
    return denominations.some((d) => d.code === code);
};
exports.isValidDenomination = isValidDenomination;
//# sourceMappingURL=denominations.js.map