"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForceMtqController = ForceMtqController;
const MinuteTransactionQueue_1 = require("../../Core/MTQ/MinuteTransactionQueue");
async function ForceMtqController(req, res) {
    try {
        const responseData = await (0, MinuteTransactionQueue_1.MinuteTransactionQueue)();
        res.json(responseData);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}
//# sourceMappingURL=forceMTQ.js.map