"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTestLoopController = CreateTestLoopController;
const CreateTestLoop_1 = require("../services/CreateTestLoop");
async function CreateTestLoopController(req, res) {
    // Check if numNewTransactions is provided in the request body
    if (!req.body.numNewTransactions) {
        return res.status(400).json({ message: "numNewTransactions is required" });
    }
    try {
        // Call the service to create test transactions
        const responseData = await (0, CreateTestLoop_1.CreateTestLoopService)(req.body.numNewTransactions);
        // Send the response with the created test transactions
        res.status(200).json(responseData);
    }
    catch (err) {
        // Handle errors and send an appropriate error response
        console.error("Error creating test transactions:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
//# sourceMappingURL=createTestLoop.js.map