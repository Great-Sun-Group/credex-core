"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeclineCredexController = DeclineCredexController;
const DeclineCredex_1 = require("../services/DeclineCredex");
async function DeclineCredexController(req, res) {
    const fieldsRequired = ["credexID"];
    for (const field of fieldsRequired) {
        if (!req.body[field]) {
            return res
                .status(400)
                .json({ message: `${field} is required` })
                .send();
        }
    }
    try {
        const responseData = await (0, DeclineCredex_1.DeclineCredexService)(req.body.credexID);
        res.json(responseData);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}
//# sourceMappingURL=declineCredex.js.map