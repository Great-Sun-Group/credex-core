import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface MemberDashboardData {
  memberID: string;
  firstname: string;
  lastname: string;
  memberHandle: string;
  defaultDenom: string;
  memberTier: number;
  remainingAvailableUSD: number;
  accountIDS: string[];
}

interface DashboardResult {
  success: boolean;
  data?: MemberDashboardData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * GetMemberDashboardByPhoneService
 * 
 * Retrieves a member's dashboard information using their phone number.
 * Includes account information and daily transaction limits.
 * 
 * @param phone - The member's phone number
 * @returns DashboardResult containing member dashboard data
 */
export async function GetMemberDashboardByPhoneService(
  phone: string
): Promise<DashboardResult> {
  logger.debug("Entering GetMemberDashboardByPhoneService", { phone });

  if (!phone) {
    return {
      success: false,
      message: "Phone number is required",
      error: {
        code: "MISSING_PHONE",
        details: "The phone number parameter must be provided"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Executing dashboard query", { phone });
    
    const result = await ledgerSpaceSession.executeRead(async (tx) => {
      const queryResult = await tx.run(
        `
        MATCH (daynode:Daynode { Active: true })
        MATCH (member:Member { phone: $phone })
        OPTIONAL MATCH (member)-[:OWNS]->(account:Account)
        OPTIONAL MATCH (account)-[:OWES|OFFERS]->(credex:Credex)-[:CREATED_ON]->(daynode)
        WITH
          member, daynode,
          COLLECT(account.accountID) AS accountIDs,
          SUM(credex.InitialAmount) AS totalIssuedTodayCXX
        RETURN
          member.memberID AS memberID,
          member.firstname AS firstname,
          member.lastname AS lastname,
          member.memberHandle AS memberHandle,
          member.defaultDenom AS defaultDenom,
          member.memberTier AS memberTier,
          totalIssuedTodayCXX/daynode["USD"] AS totalIssuedTodayUSD,
          accountIDs AS accountIDS
        `,
        { phone }
      );

      if (queryResult.records.length === 0) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            details: "Member not found with the provided phone number"
          }
        };
      }

      const record = queryResult.records[0];
      const memberTier = record.get("memberTier");
      const totalIssuedTodayUSD = record.get("totalIssuedTodayUSD") || 0;

      // Calculate remaining available USD based on member tier
      let remainingAvailableUSD: number = Infinity;
      if (memberTier === 1) {
        remainingAvailableUSD = parseFloat(
          denomFormatter(10 - totalIssuedTodayUSD, "USD")
        );
      } else if (memberTier === 2) {
        remainingAvailableUSD = parseFloat(
          denomFormatter(100 - totalIssuedTodayUSD, "USD")
        );
      }

      const dashboardData: MemberDashboardData = {
        memberID: record.get("memberID"),
        firstname: record.get("firstname"),
        lastname: record.get("lastname"),
        memberHandle: record.get("memberHandle"),
        defaultDenom: record.get("defaultDenom"),
        memberTier: memberTier,
        remainingAvailableUSD,
        accountIDS: record.get("accountIDS"),
      };

      return {
        success: true,
        data: dashboardData
      };
    });

    if (!result.success) {
      return {
        success: false,
        message: "Failed to retrieve member dashboard",
        error: result.error
      };
    }

    logger.info("Member dashboard retrieved successfully", {
      memberID: result.data?.memberID,
      phone,
      memberTier: result.data?.memberTier,
      accountCount: result.data?.accountIDS.length
    });

    return {
      success: true,
      data: result.data,
      message: "Dashboard retrieved successfully"
    };

  } catch (error) {
    logger.error("Error in GetMemberDashboardByPhoneService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      phone
    });

    return {
      success: false,
      message: "Failed to retrieve member dashboard",
      error: {
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred while retrieving dashboard"
      }
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting GetMemberDashboardByPhoneService", { phone });
  }
}
