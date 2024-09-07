"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidDenomination = exports.getFullDescription = void 0;
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