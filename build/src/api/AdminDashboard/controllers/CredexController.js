"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCredexDetails = getCredexDetails;
const GetCredexService_1 = __importDefault(require("../services/GetCredexService"));
const logger_1 = require("../../../utils/logger");
const errorUtils_1 = require("../../../utils/errorUtils");
const validators_1 = require("../../../utils/validators");
async function getCredexDetails(req, res, next) {
    const { credexID } = req.query;
    if (!credexID || !(0, validators_1.validateUUID)(credexID)) {
        return next(new errorUtils_1.ApiError('Invalid credexID', 400));
    }
    (0, logger_1.logInfo)(`Attempting to fetch details for credex: ${credexID}`);
    try {
        const result = await (0, GetCredexService_1.default)(credexID);
        (0, logger_1.logInfo)(`Successfully fetched details for credex: ${credexID}`);
        res.status(200).json(result);
    }
    catch (error) {
        (0, logger_1.logError)(`Error fetching details for credex: ${credexID}`, error);
        next(new errorUtils_1.ApiError('Error fetching credex details', 500, error.message));
    }
}
// Additional controller functions can be added here in the future
// Example:
/*
export async function updateCredexStatus(req: Request, res: Response, next: NextFunction) {
  const { credexID, newStatus } = req.body;

  if (!credexID || !validateUUID(credexID)) {
    return next(new ApiError('Invalid credexID', 400));
  }

  // Add validation for newStatus when implemented

  logInfo(`Attempting to update status for credex: ${credexID} to ${newStatus}`);

  try {
    const result = await UpdateCredexStatusService(credexID, newStatus);
    logInfo(`Successfully updated status for credex: ${credexID} to ${newStatus}`);
    res.status(200).json(result);
  } catch (error) {
    logError(`Error updating status for credex: ${credexID}`, error as Error);
    next(new ApiError('Error updating credex status', 500, (error as Error).message));
  }
}
*/ 
//# sourceMappingURL=CredexController.js.map