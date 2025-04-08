import { dashboardSwaggerTemplate } from "../../../types/dashboardSwaggerTemplate";
import { MemberError, ErrorCodes } from "../../../utils/errorUtils";
import { IMemberRepository } from "../repositories/MemberRepository";
import { ISpendLimitService } from "./SpendLimitService";
import logger from "../../../utils/logger";
import { getProfilePictureUrls } from "../../../services/assetUrlService";

// Define the actual data type for the response
interface MemberDashboardData {
  memberID: string;
  memberTier: number;
  remainingAvailableUSD?: number | null;
  firstname: string;
  lastname: string;
  memberHandle: string;
  defaultDenom: string;
  otpVerified: boolean;
  activateMarket: boolean;
  profilePictureThumbnail?: string;
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
        throw new MemberError(
          "Member not found",
          "NOT_FOUND",
          ErrorCodes.Member.NOT_FOUND
        );
      }

      // Get tier-specific spend limit if applicable using optimized service
      let remainingAvailableUSD: number | null = null;
      if (memberData.tier < 3) {
        logger.debug("Calculating remaining spend limit", {
          memberID,
          tier: memberData.tier,
        });
        remainingAvailableUSD =
          await this.spendLimitService.getRemainingLimit(memberID);
      }

      // Get profile picture thumbnail URL
      logger.debug("Fetching profile picture thumbnail URL", { memberID });
      const profilePicUrls = await getProfilePictureUrls(
        memberID,
        "Member"
      ).catch((err) => {
        logger.warn("Failed to fetch profile picture URLs", {
          memberID,
          error: err instanceof Error ? err.message : "Unknown error",
        });
        return null;
      });

      // Log the profile picture URLs for debugging
      logger.debug("Profile picture URLs retrieved", {
        memberID,
        hasProfilePics: !!profilePicUrls,
        thumbnail: profilePicUrls?.thumbnail || "none",
        original: profilePicUrls?.original ? "exists" : "none",
        pic200: profilePicUrls?.pic200 ? "exists" : "none",
        pic600: profilePicUrls?.pic600 ? "exists" : "none"
      });

      // Construct standardized response
      return {
        memberID: memberData.id,
        memberTier: memberData.tier,
        remainingAvailableUSD,
        firstname: memberData.firstname,
        lastname: memberData.lastname,
        memberHandle: memberData.memberHandle,
        defaultDenom: memberData.defaultDenom,
        otpVerified: memberData.otpVerified || false,
        activateMarket: memberData.activateMarket || false,
        profilePictureThumbnail: profilePicUrls?.thumbnail,
      };
    } catch (error) {
      logger.error("Error in getMemberDashboardData", {
        error: error instanceof Error ? error.message : "Unknown error",
        memberID,
      });

      if (error instanceof MemberError) {
        throw error;
      }

      throw new MemberError(
        "Error retrieving member dashboard data",
        "INTERNAL_ERROR",
        ErrorCodes.Admin.INTERNAL_ERROR
      );
    }
  }
}
