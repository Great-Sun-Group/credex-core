import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { MemberError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { CreditRatingService } from "./CreditRatingService";
import { getMultipleAssetUrls } from "../../../services/assetUrlService";

/**
 * Interface representing a counterparty account in the credit report
 */
export interface CounterpartyAccount {
  accountID: string;
  accountName: string;
  accountHandle: string;
  accountType: string;
  accountDescription?: string;
  thumbnailPicUrl?: string;
}

/**
 * Interface representing the complete counterparty credit report
 */
export interface CounterpartyCreditReport {
  memberID: string;
  memberName: string;
  memberHandle: string;
  creditRating: {
    redeemedTotal: number;
    outstandingTotal: number;
    defaultedTotal: number;
    writtenOffTotal: number;
    denomination: string;
  };
  accounts: CounterpartyAccount[];
  profilePictureUrls: {
    original?: string;
    thumbnail?: string;
    pic200?: string;
    pic600?: string;
  };
  reportGeneratedAt: string;
}

/**
 * Service for generating counterparty credit reports
 */
export class CounterpartyCreditReportService {
  private static instance: CounterpartyCreditReportService;
  private creditRatingService: CreditRatingService;

  constructor() {
    this.creditRatingService = CreditRatingService.getInstance();
  }

  /**
   * Get the singleton instance of CounterpartyCreditReportService
   * @returns The singleton instance
   */
  public static getInstance(): CounterpartyCreditReportService {
    if (!CounterpartyCreditReportService.instance) {
      CounterpartyCreditReportService.instance = new CounterpartyCreditReportService();
    }
    return CounterpartyCreditReportService.instance;
  }

  /**
   * Generate a comprehensive credit report for a counterparty member
   * @param memberID - UUID of the member to generate report for
   * @param denomination - The denomination to display credit rating in (defaults to "USD")
   * @returns CounterpartyCreditReport object with member info, credit rating, and accounts
   * @throws MemberError if member not found or database error
   */
  async generateCounterpartyCreditReport(
    memberID: string,
    denomination: string = "USD"
  ): Promise<CounterpartyCreditReport> {
    logger.info("Generating counterparty credit report", { memberID, denomination });
    const session = ledgerSpaceDriver.session();

    try {
      // First check if member exists and get basic info
      const memberResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (m:Member {memberID: $memberID})
           OPTIONAL MATCH (m)-[:PROFILE_PIC_ORIGINAL_JPG]->(originalPic:AssetMarker)
           OPTIONAL MATCH (m)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:AssetMarker)
           OPTIONAL MATCH (m)-[:PROFILE_PIC_200_JPG]->(pic200:AssetMarker)
           OPTIONAL MATCH (m)-[:PROFILE_PIC_600_JPG]->(pic600:AssetMarker)
           RETURN m,
           originalPic.id as originalPicID,
           thumbnailPic.id as thumbnailPicID,
           pic200.id as pic200ID,
           pic600.id as pic600ID`,
          { memberID }
        );
      });

      if (memberResult.records.length === 0) {
        logger.warn("Member not found for credit report", { memberID });
        throw new MemberError(
          "Member not found",
          "NOT_FOUND",
          ErrorCodes.Member.NOT_FOUND
        );
      }

      const member = memberResult.records[0].get("m").properties;

      // Get member's accounts
      const accountsResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (m:Member {memberID: $memberID})-[:OWNS]->(a:Account)
           OPTIONAL MATCH (a)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:AssetMarker)
           RETURN a, thumbnailPic.id as thumbnailPicID
           ORDER BY a.accountName`,
          { memberID }
        );
      });

      // Get credit rating in the specified denomination
      const creditRating = await this.creditRatingService.getMemberCreditRatingInDenom(
        memberID,
        denomination
      );

      // Get all asset IDs that need URLs
      const assetIDs = [
        memberResult.records[0].get("originalPicID"),
        memberResult.records[0].get("thumbnailPicID"),
        memberResult.records[0].get("pic200ID"),
        memberResult.records[0].get("pic600ID"),
        ...accountsResult.records.map((record: any) => record.get("thumbnailPicID")),
      ].filter(Boolean);

      // Get URLs for all assets in a single batch operation
      const assetUrls = await getMultipleAssetUrls(assetIDs);

      // Format the accounts
      const accounts: CounterpartyAccount[] = accountsResult.records.map((record: any) => {
        const account = record.get("a").properties;
        const thumbnailPicID = record.get("thumbnailPicID");
        
        return {
          accountID: account.accountID,
          accountName: account.accountName,
          accountHandle: account.accountHandle || "",
          accountType: account.accountType,
          accountDescription: account.accountDescription || "",
          thumbnailPicUrl: thumbnailPicID ? assetUrls[thumbnailPicID] : undefined,
        };
      });

      // Format profile picture URLs
      const profilePictureUrls = {
        original: memberResult.records[0].get("originalPicID")
          ? assetUrls[memberResult.records[0].get("originalPicID")]
          : undefined,
        thumbnail: memberResult.records[0].get("thumbnailPicID")
          ? assetUrls[memberResult.records[0].get("thumbnailPicID")]
          : undefined,
        pic200: memberResult.records[0].get("pic200ID")
          ? assetUrls[memberResult.records[0].get("pic200ID")]
          : undefined,
        pic600: memberResult.records[0].get("pic600ID")
          ? assetUrls[memberResult.records[0].get("pic600ID")]
          : undefined,
      };

      const report: CounterpartyCreditReport = {
        memberID: member.memberID,
        memberName: `${member.firstname} ${member.lastname}`,
        memberHandle: member.memberHandle || "",
        creditRating,
        accounts,
        profilePictureUrls,
        reportGeneratedAt: new Date().toISOString(),
      };

      logger.info("Counterparty credit report generated successfully", {
        memberID,
        denomination,
        accountsCount: accounts.length,
      });

      return report;
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }

      logger.error("Error generating counterparty credit report", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        memberID,
        denomination,
      });

      throw new MemberError(
        "Error generating credit report",
        "INTERNAL_ERROR",
        ErrorCodes.Member.INVALID_DATA
      );
    } finally {
      await session.close();
    }
  }
}
