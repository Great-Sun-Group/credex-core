import { ManagedTransaction } from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { AccountError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { ServiceResult } from "../../../types/apiResponse";

interface UpdateStoreStatusParams {
  accountID: string;
  storeOpen: boolean;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
}

interface UpdateStoreStatusResult {
  accountID: string;
  storeOpen: boolean;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
}

/**
 * Service to update a store's status and location
 */
export async function updateStoreStatus(
  params: UpdateStoreStatusParams,
  memberID: string
): Promise<ServiceResult<UpdateStoreStatusResult>> {
  const { accountID, storeOpen, location } = params;
  const session = ledgerSpaceDriver.session();

  try {
    // First, check if the member is authorized for the account
    const accountResult = await session.executeRead(
      async (tx: ManagedTransaction) => {
        const query = `
          MATCH (member:Member {memberID: $memberID})
          MATCH (account:Account {accountID: $accountID})
          RETURN 
            EXISTS((member)-[:AUTHORIZED_FOR]->(account)) as hasAccess,
            account.accountName as accountName,
            account.storeOpen as currentStoreOpen,
            account.location as currentLocation
        `;
        const result = await tx.run(query, { memberID, accountID });
        return result.records[0];
      }
    );

    if (!accountResult) {
      return {
        success: false,
        message: "Account not found",
        error: {
          code: String(ErrorCodes.Account.NOT_FOUND),
        },
      };
    }

    const hasAccess = accountResult.get("hasAccess");
    if (!hasAccess) {
      return {
        success: false,
        message: "You are not authorized to update this account",
        error: {
          code: String(ErrorCodes.Account.UNAUTHORIZED),
        },
      };
    }

    // Update the account with store status and location
    const updateResult = await session.executeWrite(
      async (tx: ManagedTransaction) => {
        // Build the SET clause dynamically based on provided parameters
        const setClause = [];
        const params: Record<string, any> = { accountID };

        // Always update storeOpen
        setClause.push("account.storeOpen = $storeOpen");
        params.storeOpen = storeOpen;

        // Update location if store is open and location is provided
        if (storeOpen && location) {
          setClause.push("account.locationLatitude = $locationLatitude");
          setClause.push("account.locationLongitude = $locationLongitude");
          params.locationLatitude = location.latitude;
          params.locationLongitude = location.longitude;
        } else if (!storeOpen) {
          // If store is closed, set location to null
          setClause.push("account.locationLatitude = null");
          setClause.push("account.locationLongitude = null");
        }

        const query = `
          MATCH (account:Account {accountID: $accountID})
          SET ${setClause.join(", ")}
          RETURN 
            account.accountID as accountID,
            account.storeOpen as storeOpen,
            account.locationLatitude as locationLatitude,
            account.locationLongitude as locationLongitude
        `;

        const result = await tx.run(query, params);
        const record = result.records[0];
        const locationLatitude = record.get("locationLatitude");
        const locationLongitude = record.get("locationLongitude");
        
        // Create a location object if both latitude and longitude are present
        const locationObj = (locationLatitude !== null && locationLongitude !== null) 
          ? { latitude: locationLatitude, longitude: locationLongitude } 
          : null;
        
        return {
          accountID: record.get("accountID"),
          storeOpen: record.get("storeOpen"),
          location: locationObj,
        };
      }
    );

    logger.info("Store status updated successfully", {
      accountID,
      memberID,
      storeOpen,
      hasLocation: location !== null && location !== undefined,
    });

    return {
      success: true,
      message: "Store status updated successfully",
      data: updateResult,
    };
  } catch (error) {
    logger.error("Error updating store status", {
      error: error instanceof Error ? error.message : "Unknown error",
      memberID,
      storeOpen,
      hasLocation: location !== null && location !== undefined,
    });

    return {
      success: false,
      message: "Failed to update store status",
      error: {
        code: String(ErrorCodes.Admin.INTERNAL_ERROR),
        details: error instanceof Error ? error.message : "Unknown error",
      },
    };
  } finally {
    await session.close();
  }
}
