"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRandomFloatingCredexesController = CreateRandomFloatingCredexesController;
const CreateRandomFloatingCredexes_1 = require("../services/CreateRandomFloatingCredexes");
async function CreateRandomFloatingCredexesController(req, res) {
    // Check if numNewTransactions is provided in the request body
    if (!req.body.numNewTransactions) {
        return res.status(400).json({ message: "numNewTransactions is required" });
    }
    try {
        // Call the service to create test transactions
        const responseData = await (0, CreateRandomFloatingCredexes_1.CreateRandomFloatingCredexesService)(req.body.numNewTransactions);
        // Send the response with the created test transactions
        res.status(200).json(responseData);
    }
    catch (err) {
        // Handle errors and send an appropriate error response
        console.error("Error creating test transactions:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
//# sourceMappingURL=createRandomFloatingCredexes.js.map