"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrowthTestController = GrowthTestController;
const GrowthTest_1 = require("../services/GrowthTest");
async function GrowthTestController(req, res) {
    const fieldsRequired = [
        "numberDays",
        "accountGrowthRate",
        "USD_SECURED_fractionToPurchase",
        "USD_SECURED_amountPerPurchaseLow",
        "USD_SECURED_amountPerPurchaseHigh",
        "USD_SECURED_fractionToSell",
        "ZIG_SECURED_fractionToPurchase",
        "ZIG_SECURED_amountPerPurchaseLow",
        "ZIG_SECURED_amountPerPurchaseHigh",
        "ZIG_SECURED_fractionToSell",
        "dailyFloatingRandomTransactionsPerAccount",
    ];
    for (const field of fieldsRequired) {
        if (!req.body[field]) {
            return res
                .status(400)
                .json({ message: `${field} is required` })
                .send();
        }
    }
    try {
        const responseData = await (0, GrowthTest_1.GrowthTestService)(req.body);
        res.status(200).json(responseData);
    }
    catch (err) {
        // Handle errors and send an appropriate error response
        console.error("Error in growthTest:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
//# sourceMappingURL=growthTest.js.map