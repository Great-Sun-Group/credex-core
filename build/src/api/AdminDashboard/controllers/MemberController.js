"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemberDetails = getMemberDetails;
exports.updateMemberTier = updateMemberTier;
const GetMemberService_1 = __importDefault(require("../services/GetMemberService"));
const UpdateMemberTierService_1 = __importDefault(require("../services/UpdateMemberTierService"));
async function getMemberDetails(req, res) {
    const { memberHandle } = req.query;
    if (!memberHandle) {
        return res.status(400).json({
            message: 'The memberHandle is required'
        });
    }
    try {
        const result = await (0, GetMemberService_1.default)(memberHandle);
        return res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in getMemberDetails controller:', error);
        return res.status(500).json({
            message: 'Error fetching member details',
            error: error.message
        });
    }
}
async function updateMemberTier(req, res) {
    const { memberHandle, newTier } = req.body;
    if (!memberHandle || !newTier) {
        return res.status(400).json({
            message: 'The memberHandle and newTier are required'
        });
    }
    try {
        const result = await (0, UpdateMemberTierService_1.default)(memberHandle, newTier);
        return res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in updateMemberTier controller:', error);
        return res.status(500).json({
            message: 'Error updating member tier',
            error: error.message
        });
    }
}
/*
export async function updateMemberStatus(req: Request, res: Response) {
  const { memberHandle, newStatus } = req.body;

  if (!memberHandle || !newStatus) {
    return res.status(400).json({
      message: 'The memberHandle and newStatus are required'
    });
  }

  try {
    const result = await UpdateMemberStatusService(memberHandle, newStatus);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in updateMemberStatus controller:', error);
    return res.status(500).json({
      message: 'Error updating member status',
      error: (error as Error).message
    });
  }
}


export async function logMemberInteraction(req: Request, res: Response) {
  const { memberHandle, interactionType, interactionDetails } = req.body;

  if (!memberHandle || !interactionType || !interactionDetails) {
    return res.status(400).json({
      message: 'The memberHandle, interactionType, and interactionDetails are required'
    });
  }

  try {
    const result = await LogMemberInteractionService(memberHandle, interactionType, interactionDetails);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in logMemberInteraction controller:', error);
    return res.status(500).json({
      message: 'Error logging member interaction',
      error: (error as Error).message
    });
  }
}
  */
//# sourceMappingURL=MemberController.js.map