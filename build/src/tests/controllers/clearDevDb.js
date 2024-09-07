"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClearDevDbController = ClearDevDbController;
const ClearDevDb_1 = require("../services/ClearDevDb");
async function ClearDevDbController(req, res) {
    try {
        // Call the service to clear the development database
        await (0, ClearDevDb_1.ClearDevDbService)();
        // Send a success response
        res
            .status(200)
            .json({ message: "Development databases cleared successfully" });
    }
    catch (err) {
        // Handle errors and send an appropriate error response
        console.error("Error clearing development databases:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
//# sourceMappingURL=clearDevDb.js.map