"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForceDcoController = ForceDcoController;
const DailyCredcoinOffering_1 = require("../../Core/DCO/DailyCredcoinOffering");
async function ForceDcoController(req, res) {
    try {
        const responseData = await (0, DailyCredcoinOffering_1.DailyCredcoinOffering)();
        res.json(responseData);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}
//# sourceMappingURL=forceDCO.js.map