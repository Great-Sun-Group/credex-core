"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSendOffersToController = UpdateSendOffersToController;
const UpdateSendOffersTo_1 = require("../services/UpdateSendOffersTo");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function UpdateSendOffersToController(req, res, next) {
    const { memberIDtoSendOffers, accountID, ownerID } = req.body;
    try {
        // Validate input
        if (!(0, validators_1.validateUUID)(memberIDtoSendOffers)) {
            return res.status(400).json({ message: "Invalid memberIDtoSendOffers" });
        }
        if (!(0, validators_1.validateUUID)(accountID)) {
            return res.status(400).json({ message: "Invalid accountID" });
        }
        if (!(0, validators_1.validateUUID)(ownerID)) {
            return res.status(400).json({ message: "Invalid ownerID" });
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