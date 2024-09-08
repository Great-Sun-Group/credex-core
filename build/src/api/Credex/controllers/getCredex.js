"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetCredexController = GetCredexController;
const GetCredex_1 = require("../services/GetCredex");
async function GetCredexController(req, res) {
    const fieldsRequired = ["credexID", "accountID"];
    for (const field of fieldsRequired) {
        if (!req.body[field]) {
            return res
                .status(400)
                .json({ message: `${field} is required` })
                .send();
        }
    }
    try {
        const responseData = await (0, GetCredex_1.GetCredexService)(req.body.credexID, req.body.accountID);
        res.json(responseData);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
}
//# sourceMappingURL=getCredex.js.map