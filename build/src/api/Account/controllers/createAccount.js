"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAccountController = CreateAccountController;
const CreateAccount_1 = require("../services/CreateAccount");
const accountTypes_1 = require("../../../constants/accountTypes");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
async function CreateAccountController(req, res, next) {
    const { ownerID, accountType, accountName, accountHandle, defaultDenom, DCOgiveInCXX, DCOdenom } = req.body;
    try {
        // Validate input
        if (!(0, validators_1.validateUUID)(ownerID)) {
            res.status(400).json({ message: "Invalid ownerID" });
            return;
        }
        if (!(0, accountTypes_1.checkPermittedAccountType)(accountType)) {
            res.status(400).json({ message: "Invalid accountType" });
            return;
        }
        if (!(0, validators_1.validateAccountName)(accountName)) {
            res.status(400).json({ message: "Invalid accountName" });
            return;
        }
        if (!(0, validators_1.validateAccountHandle)(accountHandle)) {
            res.status(400).json({ message: "Invalid accountHandle" });
            return;
        }
        if (!(0, validators_1.validateDenomination)(defaultDenom)) {
            res.status(400).json({ message: "Invalid defaultDenom" });
            return;
        }
        if (DCOdenom && !(0, validators_1.validateDenomination)(DCOdenom)) {
            res.status(400).json({ message: "Invalid DCOdenom" });
            return;
        }
        if (DCOgiveInCXX && !(0, validators_1.validateAmount)(DCOgiveInCXX)) {
            res.status(400).json({ message: "Invalid DCOgiveInCXX" });
            return;
        }
        logger_1.default.info("Creating new account", {
            ownerID,
            accountType,
            accountName,
            accountHandle,
            defaultDenom,
            DCOdenom,
        });
        const newAccount = await (0, CreateAccount_1.CreateAccountService)(ownerID, accountType, accountName, accountHandle, defaultDenom, DCOgiveInCXX, DCOdenom);
        if (newAccount.accountID) {
            logger_1.default.info("Account created successfully", { accountID: newAccount.accountID });
            res.status(201).json({ accountID: newAccount.accountID, message: "Account created successfully" });
        }
        else {
            res.status(400).json({ message: newAccount.message || "Failed to create account" });
        }
    }
    catch (error) {
        logger_1.default.error("Error in CreateAccountController", { error });
        next(error);
    }
}
//# sourceMappingURL=createAccount.js.map