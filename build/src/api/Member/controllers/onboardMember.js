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
/**
 * Validates input for onboarding a new member
 * @param firstname - First name of the member
 * @param lastname - Last name of the member
 * @param phone - Phone number of the member
 * @returns null if valid, error message string if invalid
 */
function validateInput(firstname, lastname, phone) {
    if (!firstname || !lastname || !phone) {
        return "firstname, lastname, and phone are required";
    }
    if (typeof firstname !== "string" ||
        typeof lastname !== "string" ||
        typeof phone !== "string") {
        return "firstname, lastname, and phone must be strings";
    }
    if (firstname.length < 2 || firstname.length > 50 || lastname.length < 2 || lastname.length > 50) {
        return "First name and last name must be between 2 and 50 characters";
    }
    // Phone number validation (with optional '+' prefix)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
        return "Invalid phone number format. It should be a valid international phone number.";
    }
    return null;
}
/**
 * Controller for onboarding a new member
 * @param firstname - First name of the member
 * @param lastname - Last name of the member
 * @param phone - Phone number of the member
 * @returns Object containing member dashboard or error message
 */
async function OnboardMemberController(firstname, lastname, phone) {
    const validationError = validateInput(firstname, lastname, phone);
    if (validationError) {
        logger_1.default.warn("Invalid input for onboarding member", { firstname, lastname, phone, error: validationError });
        return { error: validationError };
    }
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
/**
 * Express middleware wrapper for onboarding a new member
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
async function onboardMemberExpressHandler(req, res, next) {
    const { firstname, lastname, phone } = req.body;
    try {
        const result = await OnboardMemberController(firstname, lastname, phone);
        if ("error" in result) {
            res.status(400).json({ message: result.error });
        }
        else {
            res.status(201).json(result);
        }
    }
    catch (error) {
        logger_1.default.error("Error in onboardMemberExpressHandler", { error, firstname, lastname, phone });
        next(error);
    }
}
//# sourceMappingURL=onboardMember.js.map