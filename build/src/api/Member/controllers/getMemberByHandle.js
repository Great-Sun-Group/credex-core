"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetMemberByHandleController = void 0;
const GetMemberByHandle_1 = require("../services/GetMemberByHandle");
const logger_1 = __importDefault(require("../../../../config/logger"));
const validators_1 = require("../../../utils/validators");
const GetMemberByHandleController = async (req, res, next) => {
    const { memberHandle } = req.body;
    try {
        if (!(0, validators_1.validateMemberHandle)(memberHandle)) {
            res.status(400).json({ message: 'Invalid member handle. Only lowercase letters, numbers, periods, and underscores are allowed. Length must be between 3 and 30 characters.' });
            return;
        }
        logger_1.default.info("Retrieving member by handle", { memberHandle });
        const memberData = await (0, GetMemberByHandle_1.GetMemberByHandleService)(memberHandle);
        if (memberData) {
            logger_1.default.info("Member retrieved successfully", { memberHandle });
            res.status(200).json({ memberData });
        }
        else {
            logger_1.default.info("Member not found", { memberHandle });
            res.status(404).json({ message: "Member not found" });
        }
    }
    catch (error) {
        logger_1.default.error("Error in GetMemberByHandleController", { error, memberHandle });
        next(error);
    }
};
exports.GetMemberByHandleController = GetMemberByHandleController;
//# sourceMappingURL=getMemberByHandle.js.map