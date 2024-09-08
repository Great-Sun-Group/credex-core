"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemberDetails = getMemberDetails;
exports.updateMemberTier = updateMemberTier;
const GetMemberService_1 = __importDefault(require("../services/GetMemberService"));
const UpdateMemberTierService_1 = __importDefault(require("../services/UpdateMemberTierService"));
const logger_1 = require("../../../utils/logger");
const errorUtils_1 = require("../../../utils/errorUtils");
const validators_1 = require("../../../utils/validators");
async function getMemberDetails(req, res, next) {
    const { memberHandle } = req.query;
    if (!memberHandle || !(0, validators_1.validateMemberHandle)(memberHandle)) {
        return next(new errorUtils_1.ApiError('Invalid memberHandle', 400));
    }
    try {
        const result = await (0, GetMemberService_1.default)(memberHandle);
        (0, logger_1.logInfo)(`Successfully fetched member details for ${memberHandle}`);
        res.status(200).json(result);
    }
    catch (error) {
        (0, logger_1.logError)('Error in getMemberDetails controller', error);
        next(new errorUtils_1.ApiError('Error fetching member details', 500, error.message));
    }
}
async function updateMemberTier(req, res, next) {
    const { memberHandle, newTier } = req.body;
    if (!memberHandle || !(0, validators_1.validateMemberHandle)(memberHandle)) {
        return next(new errorUtils_1.ApiError('Invalid memberHandle', 400));
    }
    if (!newTier || !(0, validators_1.validateTier)(Number(newTier))) {
        return next(new errorUtils_1.ApiError('Invalid newTier', 400));
    }
    try {
        const result = await (0, UpdateMemberTierService_1.default)(memberHandle, newTier);
        (0, logger_1.logInfo)(`Successfully updated tier for member ${memberHandle} to ${newTier}`);
        res.status(200).json(result);
    }
    catch (error) {
        (0, logger_1.logError)('Error in updateMemberTier controller', error);
        next(new errorUtils_1.ApiError('Error updating member tier', 500, error.message));
    }
}
// Keep the commented out functions for future reference
/*
export async function updateMemberStatus(req: Request, res: Response, next: NextFunction) {
  const { memberHandle, newStatus } = req.body;

  if (!memberHandle || !validateMemberHandle(memberHandle)) {
    return next(new ApiError('Invalid memberHandle', 400));
  }

  // Add validation for newStatus when implemented

  try {
    const result = await UpdateMemberStatusService(memberHandle, newStatus);
    logInfo(`Successfully updated status for member ${memberHandle} to ${newStatus}`);
    res.status(200).json(result);
  } catch (error) {
    logError('Error in updateMemberStatus controller', error as Error);
    next(new ApiError('Error updating member status', 500, (error as Error).message));
  }
}

export async function logMemberInteraction(req: Request, res: Response, next: NextFunction) {
  const { memberHandle, interactionType, interactionDetails } = req.body;

  if (!memberHandle || !validateMemberHandle(memberHandle)) {
    return next(new ApiError('Invalid memberHandle', 400));
  }

  // Add validation for interactionType and interactionDetails when implemented

  try {
    const result = await LogMemberInteractionService(memberHandle, interactionType, interactionDetails);
    logInfo(`Successfully logged interaction for member ${memberHandle}`);
    res.status(200).json(result);
  } catch (error) {
    logError('Error in logMemberInteraction controller', error as Error);
    next(new ApiError('Error logging member interaction', 500, (error as Error).message));
  }
}
*/
//# sourceMappingURL=MemberController.js.map