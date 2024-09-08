"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCredexDetails = getCredexDetails;
const GetCredexService_1 = __importDefault(require("../services/GetCredexService"));
const logger_1 = require("../../../utils/logger");
async function getCredexDetails(req, res) {
    (0, logger_1.logInfo)("getCredexDetails controller hit");
    const { credexID } = req.query;
    if (!credexID) {
        return res.status(400).json({
            message: 'The credexID is required'
        });
    }
    try {
        const result = await (0, GetCredexService_1.default)(credexID);
        return res.status(200).json(result);
    }
    catch (error) {
        (0, logger_1.logError)('Error in getCredexDetails controller', error);
        return res.status(500).json({
            message: 'Error fetching credex details',
            error: error.message
        });
    }
}
//# sourceMappingURL=CredexController.js.map