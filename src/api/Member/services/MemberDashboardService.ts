import { dashboardSwaggerTemplate } from '../../../types/dashboardSwaggerTemplate';
import { MemberError, ErrorCodes } from '../../../utils/errorUtils';
import { IMemberRepository } from '../repositories/MemberRepository';
import { ISpendLimitService } from './SpendLimitService';
import logger from '../../../utils/logger';

// Define the actual data type for the response
interface MemberDashboardData {
  memberID: string;
  memberTier: number;
  remainingAvailableUSD?: number;
  firstname: string;
  lastname: string;
  memberHandle: string;
  defaultDenom: string;
}

export interface IMemberDashboardService {
  getMemberDashboardData(memberID: string): Promise<MemberDashboardData>;
}

export class MemberDashboardService implements IMemberDashboardService {
  constructor(
    private readonly memberRepo: IMemberRepository,
    private readonly spendLimitService: ISpendLimitService
  ) {}

  /**
   * Retrieves complete member dashboard data
   * @param memberID - UUID of the member
   * @returns Standardized member dashboard data
   * @throws McpError if member not found or data incomplete
   */
  async getMemberDashboardData(memberID: string): Promise<MemberDashboardData> {
    try {
      logger.debug("Retrieving member dashboard data", { memberID });

      // Get basic member data from optimized repository
      const memberData = await this.memberRepo.findById(memberID);
      if (!memberData) {
        logger.warn("Member not found", { memberID });
        throw new MemberError('Member not found', 'NOT_FOUND', ErrorCodes.Member.NOT_FOUND);
      }

      // Get tier-specific spend limit if applicable using optimized service
      let remainingAvailableUSD: number | undefined;
      if (memberData.tier < 3) {
        logger.debug("Calculating remaining spend limit", { memberID, tier: memberData.tier });
        remainingAvailableUSD = await this.spendLimitService.getRemainingLimit(memberID);
      }

      // Construct standardized response
      return {
        memberID: memberData.id,
        memberTier: memberData.tier,
        remainingAvailableUSD,
        firstname: memberData.firstname,
        lastname: memberData.lastname,
        memberHandle: memberData.memberHandle,
        defaultDenom: memberData.defaultDenom
      };
    } catch (error) {
      logger.error("Error in getMemberDashboardData", {
        error: error instanceof Error ? error.message : "Unknown error",
        memberID
      });

      if (error instanceof MemberError) {
        throw error;
      }

      throw new MemberError(
        'Error retrieving member dashboard data',
        'INTERNAL_ERROR',
        ErrorCodes.Admin.INTERNAL_ERROR
      );
    }
  }
}
