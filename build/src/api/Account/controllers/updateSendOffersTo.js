"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSendOffersToController = UpdateSendOffersToController;
const UpdateSendOffersTo_1 = require("../services/UpdateSendOffersTo");
const logger_1 = __importDefault(require("../../../../config/logger"));
/**
 * Controller for updating the recipient of offers for an account
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
async function UpdateSendOffersToController(req, res, next) {
    const requiredFields = ["memberIDtoSendOffers", "accountID", "ownerID"];
    try {
        for (const field of requiredFields) {
            if (!req.body[field]) {
                res.status(400).json({ message: `${field} is required` });
                return;
            }
        }
        const { memberIDtoSendOffers, accountID, ownerID } = req.body;
        // Validate memberIDtoSendOffers
        if (typeof memberIDtoSendOffers !== 'string' || !/^[a-f0-9-]{36}$/.test(memberIDtoSendOffers)) {
            res.status(400).json({ message: "Invalid memberIDtoSendOffers. Must be a valid UUID." });
            return;
        }
        // Validate accountID
        if (typeof accountID !== 'string' || !/^[a-f0-9-]{36}$/.test(accountID)) {
            res.status(400).json({ message: "Invalid accountID. Must be a valid UUID." });
            return;
        }
        // Validate ownerID
        if (typeof ownerID !== 'string' || !/^[a-f0-9-]{36}$/.test(ownerID)) {
            res.status(400).json({ message: "Invalid ownerID. Must be a valid UUID." });
            return;
        }
        logger_1.default.info("Updating offer recipient for account", { memberIDtoSendOffers, accountID, ownerID });
        const responseData = await (0, UpdateSendOffersTo_1.UpdateSendOffersToService)(memberIDtoSendOffers, accountID, ownerID);
        if (!responseData) {
            logger_1.default.warn("Failed to update offer recipient for account", { memberIDtoSendOffers, accountID, ownerID });
            res.status(400).json({ message: "Failed to update offer recipient for account" });
            return;
        }
        logger_1.default.info("Offer recipient updated successfully for account", { memberIDtoSendOffers, accountID, ownerID });
        res.status(200).json(responseData);
    }
    catch (error) {
        logger_1.default.error("Error in UpdateSendOffersToController", { error, memberIDtoSendOffers: req.body.memberIDtoSendOffers, accountID: req.body.accountID, ownerID: req.body.ownerID });
        next(error);
    }
}
//# sourceMappingURL=updateSendOffersTo.js.map