"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardMemberController = OnboardMemberController;
exports.onboardMemberExpressHandler = onboardMemberExpressHandler;
const OnboardMember_1 = require("../services/OnboardMember");
const GetMemberDashboardByPhone_1 = require("../services/GetMemberDashboardByPhone");
const logger_1 = __importDefault(require("../../../../config/logger"));
const memberSchemas_1 = require("../validators/memberSchemas");
async function OnboardMemberController(firstname, lastname, phone) {
    try {
        logger_1.default.info("Onboarding new member", { firstname, lastname, phone });
        const onboardedMember = await (0, OnboardMember_1.OnboardMemberService)(firstname, lastname, phone);
        if (!onboardedMember.onboardedMemberID) {
            logger_1.default.warn("Failed to onboard member", { firstname, lastname, phone, error: onboardedMember.message });
            return { error: onboardedMember.message || "Failed to onboard member" };
        }
        logger_1.default.info("Member onboarded successfully", { memberID: onboardedMember.onboardedMemberID });
        const memberDashboard = await (0, GetMemberDashboardByPhone_1.GetMemberDashboardByPhoneService)(phone);
        if (!memberDashboard) {
            logger_1.default.warn("Could not retrieve member dashboard after onboarding", { phone });
            return { error: "Could not retrieve member dashboard" };
        }
        logger_1.default.info("Member dashboard retrieved successfully", { memberID: onboardedMember.onboardedMemberID });
        return { memberDashboard };
    }
    catch (error) {
        logger_1.default.error("Error in OnboardMemberController", { error, firstname, lastname, phone });
        return { error: "Internal Server Error" };
    }
}
async function onboardMemberExpressHandler(req, res, next) {
    try {
        const { error, value } = memberSchemas_1.onboardMemberSchema.validate(req.body);
        if (error) {
            res.status(400).json({ message: error.details[0].message });
            return;
        }
        const { firstname, lastname, phone } = value;
        const result = await OnboardMemberController(firstname, lastname, phone);
        if ("error" in result) {
            res.status(400).json({ message: result.error });
        }
        else {
            res.status(201).json(result);
        }
    }
    catch (error) {
        logger_1.default.error("Error in onboardMemberExpressHandler", { error, body: req.body });
        next(error);
    }
}
//# sourceMappingURL=onboardMember.js.map