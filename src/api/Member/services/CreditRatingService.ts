import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { MemberError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

/**
 * Interface representing a member's credit rating in CXX
 * These are raw values that can be converted to any denomination
 */
export interface CreditRatingCXX {
  redeemedTotalCXX: number;
  outstandingTotalCXX: number;
  defaultedTotalCXX: number;
  writtenOffTotalCXX: number;
}

/**
 * Interface representing a member's credit rating in a specific denomination
 */
export interface CreditRating {
  redeemedTotal: number;
  outstandingTotal: number;
  defaultedTotal: number;
  writtenOffTotal: number;
  denomination: string;
}

/**
 * Interface for the credit rating service
 */
export interface ICreditRatingService {
  /**
   * Get the credit rating for a specific member in CXX
   * @param memberID - UUID of the member
   * @returns CreditRatingCXX object with totals in CXX
   */
  getMemberCreditRatingCXX(memberID: string): Promise<CreditRatingCXX>;

  /**
   * Get the credit rating for a specific member in the specified denomination
   * @param memberID - UUID of the member
   * @param denomination - The denomination to convert to (e.g., "USD", "CAD", "XAU")
   * @returns CreditRating object with totals in the specified denomination
   */
  getMemberCreditRatingInDenom(memberID: string, denomination: string): Promise<CreditRating>;

  /**
   * Get the credit rating for the owner of a specific account in CXX
   * @param accountID - UUID of the account
   * @returns CreditRatingCXX object with totals in CXX
   */
  getAccountOwnerCreditRatingCXX(accountID: string): Promise<CreditRatingCXX>;

  /**
   * Get the credit rating for the owner of a specific account in the specified denomination
   * @param accountID - UUID of the account
   * @param denomination - The denomination to convert to (e.g., "USD", "CAD", "XAU")
   * @returns CreditRating object with totals in the specified denomination
   */
  getAccountOwnerCreditRatingInDenom(accountID: string, denomination: string): Promise<CreditRating>;
}

/**
 * Service for calculating member credit ratings based on unsecured credexes
 * issued by all accounts owned by the member
 */
export class CreditRatingService implements ICreditRatingService {
  private static instance: CreditRatingService;

  /**
   * Get the singleton instance of CreditRatingService
   * @returns The singleton instance
   */
  public static getInstance(): CreditRatingService {
    if (!CreditRatingService.instance) {
      CreditRatingService.instance = new CreditRatingService();
    }
    return CreditRatingService.instance;
  }
  /**
   * Get the credit rating for a specific member in CXX
   * @param memberID - UUID of the member
   * @returns CreditRatingCXX object with totals in CXX
   * @throws MemberError if member not found or database error
   */
  async getMemberCreditRatingCXX(memberID: string): Promise<CreditRatingCXX> {
    logger.debug("Getting CXX credit rating for member", { memberID });
    const session = ledgerSpaceDriver.session();

    try {
      // First check if member exists
      const memberCheck = await session.run(
        `
        MATCH (member:Member {memberID: $memberID})
        RETURN member IS NOT NULL AS memberExists
        `,
        { memberID }
      );

      if (!memberCheck.records[0]?.get("memberExists")) {
        logger.warn("Member not found when getting credit rating", { memberID });
        throw new MemberError(
          "Member not found",
          "NOT_FOUND",
          ErrorCodes.Member.NOT_FOUND
        );
      }

      // Execute query to calculate credit rating in CXX
      const result = await session.run(
        `
        MATCH (member:Member {memberID: $memberID})
        
        // Find all accounts owned by the member
        MATCH (member)-[:OWNS]->(account:Account)
        
        // Find all unsecured credexes issued by the member's accounts that have been accepted
        OPTIONAL MATCH (account)-[:OWES|CLEARED]->(credex:Credex)
        WHERE NOT (credex)<-[:SECURES]-() // Ensure it's unsecured
        
        // Calculate totals in CXX
        WITH 
          member, 
          COLLECT(credex) AS credexes
        
        // Calculate totals, handling null values
        RETURN {
          redeemedTotalCXX: REDUCE(total = 0, c IN credexes | 
            CASE WHEN c IS NOT NULL THEN total + c.RedeemedAmount ELSE total END
          ),
          outstandingTotalCXX: REDUCE(total = 0, c IN credexes | 
            CASE WHEN c IS NOT NULL THEN total + c.OutstandingAmount ELSE total END
          ),
          defaultedTotalCXX: REDUCE(total = 0, c IN credexes | 
            CASE WHEN c IS NOT NULL THEN total + c.DefaultedAmount ELSE total END
          ),
          writtenOffTotalCXX: REDUCE(total = 0, c IN credexes | 
            CASE WHEN c IS NOT NULL THEN total + c.WrittenOffAmount ELSE total END
          )
        } AS creditRating
        `,
        { memberID }
      );

      if (result.records.length === 0) {
        // This shouldn't happen since we checked for member existence
        logger.error("No credit rating results returned for existing member", { memberID });
        throw new MemberError(
          "Error calculating credit rating",
          "INTERNAL_ERROR",
          ErrorCodes.Member.INVALID_DATA
        );
      }

      const creditRating = result.records[0].get("creditRating");
      
      // Ensure all values are numbers and not null
      const sanitizedRating: CreditRatingCXX = {
        redeemedTotalCXX: this.sanitizeNumber(creditRating.redeemedTotalCXX),
        outstandingTotalCXX: this.sanitizeNumber(creditRating.outstandingTotalCXX),
        defaultedTotalCXX: this.sanitizeNumber(creditRating.defaultedTotalCXX),
        writtenOffTotalCXX: this.sanitizeNumber(creditRating.writtenOffTotalCXX)
      };

      logger.debug("CXX credit rating calculated for member", { 
        memberID, 
        creditRating: sanitizedRating 
      });

      return sanitizedRating;
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      
      logger.error("Error in getMemberCreditRatingCXX", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        memberID
      });
      
      throw new MemberError(
        "Error calculating credit rating",
        "INTERNAL_ERROR",
        ErrorCodes.Member.INVALID_DATA
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Get the credit rating for a specific member in the specified denomination
   * @param memberID - UUID of the member
   * @param denomination - The denomination to convert to (e.g., "USD", "CAD", "XAU")
   * @returns CreditRating object with totals in the specified denomination
   * @throws MemberError if member not found, invalid denomination, or database error
   */
  async getMemberCreditRatingInDenom(memberID: string, denomination: string): Promise<CreditRating> {
    logger.debug("Getting credit rating for member in denomination", { memberID, denomination });
    const session = ledgerSpaceDriver.session();

    try {
      // Validate denomination
      if (!denomination || typeof denomination !== 'string') {
        throw new MemberError(
          "Invalid denomination",
          "INVALID_PARAMETER",
          ErrorCodes.Member.INVALID_DATA
        );
      }

      // Get CXX values first
      const cxxRating = await this.getMemberCreditRatingCXX(memberID);
      
      // Get conversion rate from daynode
      const rateResult = await session.run(
        `
        MATCH (daynode:Daynode {Active: true})
        RETURN daynode[$denomination] AS conversionRate
        `,
        { denomination }
      );

      if (rateResult.records.length === 0 || !rateResult.records[0].get("conversionRate")) {
        logger.error("Denomination not found in daynode", { denomination });
        throw new MemberError(
          `Denomination '${denomination}' not supported`,
          "INVALID_PARAMETER",
          ErrorCodes.Member.INVALID_DATA
        );
      }

      const conversionRate = this.sanitizeNumber(rateResult.records[0].get("conversionRate"));
      
      // Convert CXX values to the specified denomination
      const convertedRating: CreditRating = {
        redeemedTotal: cxxRating.redeemedTotalCXX / conversionRate,
        outstandingTotal: cxxRating.outstandingTotalCXX / conversionRate,
        defaultedTotal: cxxRating.defaultedTotalCXX / conversionRate,
        writtenOffTotal: cxxRating.writtenOffTotalCXX / conversionRate,
        denomination
      };

      logger.debug(`Credit rating calculated for member in ${denomination}`, { 
        memberID, 
        creditRating: convertedRating 
      });

      return convertedRating;
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      
      logger.error("Error in getMemberCreditRatingInDenom", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        memberID,
        denomination
      });
      
      throw new MemberError(
        "Error calculating credit rating",
        "INTERNAL_ERROR",
        ErrorCodes.Member.INVALID_DATA
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Get the credit rating for the owner of a specific account in CXX
   * @param accountID - UUID of the account
   * @returns CreditRatingCXX object with totals in CXX
   * @throws MemberError if account not found, no owner found, or database error
   */
  async getAccountOwnerCreditRatingCXX(accountID: string): Promise<CreditRatingCXX> {
    logger.debug("Getting CXX credit rating for account owner", { accountID });
    const session = ledgerSpaceDriver.session();

    try {
      // Find the member who owns the account
      const ownerResult = await session.run(
        `
        MATCH (account:Account {accountID: $accountID})
        MATCH (member:Member)-[:OWNS]->(account)
        RETURN member.memberID AS memberID
        `,
        { accountID }
      );

      if (ownerResult.records.length === 0) {
        logger.warn("Account not found or no owner found", { accountID });
        throw new MemberError(
          "Account not found or no owner found",
          "NOT_FOUND",
          ErrorCodes.Member.NOT_FOUND
        );
      }

      const memberID = ownerResult.records[0].get("memberID");
      
      // Get the CXX credit rating for the member
      return this.getMemberCreditRatingCXX(memberID);
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      
      logger.error("Error in getAccountOwnerCreditRatingCXX", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        accountID
      });
      
      throw new MemberError(
        "Error calculating credit rating for account owner",
        "INTERNAL_ERROR",
        ErrorCodes.Member.INVALID_DATA
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Get the credit rating for the owner of a specific account in the specified denomination
   * @param accountID - UUID of the account
   * @param denomination - The denomination to convert to (e.g., "USD", "CAD", "XAU")
   * @returns CreditRating object with totals in the specified denomination
   * @throws MemberError if account not found, no owner found, invalid denomination, or database error
   */
  async getAccountOwnerCreditRatingInDenom(accountID: string, denomination: string): Promise<CreditRating> {
    logger.debug("Getting credit rating for account owner in denomination", { accountID, denomination });
    const session = ledgerSpaceDriver.session();

    try {
      // Find the member who owns the account
      const ownerResult = await session.run(
        `
        MATCH (account:Account {accountID: $accountID})
        MATCH (member:Member)-[:OWNS]->(account)
        RETURN member.memberID AS memberID
        `,
        { accountID }
      );

      if (ownerResult.records.length === 0) {
        logger.warn("Account not found or no owner found", { accountID });
        throw new MemberError(
          "Account not found or no owner found",
          "NOT_FOUND",
          ErrorCodes.Member.NOT_FOUND
        );
      }

      const memberID = ownerResult.records[0].get("memberID");
      
      // Get the credit rating for the member in the specified denomination
      return this.getMemberCreditRatingInDenom(memberID, denomination);
    } catch (error) {
      if (error instanceof MemberError) {
        throw error;
      }
      
      logger.error("Error in getAccountOwnerCreditRatingInDenom", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        accountID,
        denomination
      });
      
      throw new MemberError(
        "Error calculating credit rating for account owner",
        "INTERNAL_ERROR",
        ErrorCodes.Member.INVALID_DATA
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Sanitize a number value, ensuring it's a valid number and not null/undefined
   * @param value - The value to sanitize
   * @returns A valid number, defaulting to 0 if invalid
   */
  private sanitizeNumber(value: any): number {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return 0;
    }
    
    // Handle neo4j Integer objects
    if (typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    
    return Number(value);
  }
}
