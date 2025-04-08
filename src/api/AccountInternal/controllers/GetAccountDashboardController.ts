import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";

/**
 * Controller for retrieving account dashboard information
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function GetAccountDashboardController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();

  try {
    logger.info("GetAccountDashboardController called", {
      controller: "GetAccountDashboardController",
      params: req.params,
    });

    const { accountID } = req.params;
    const memberID = req.user?.memberID;

    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if the account exists and is accessible by the member
    const accountCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AccountInternal {id: $accountID})
         OPTIONAL MATCH (m:Member {memberID: $memberID})-[:OWNS]->(a)
         RETURN a, m IS NOT NULL as isOwner`,
        { accountID, memberID }
      );
    });

    if (accountCheckResult.records.length === 0) {
      throw new Error("Account not found");
    }

    const account = accountCheckResult.records[0].get("a").properties;
    const isOwner = accountCheckResult.records[0].get("isOwner");

    // If the account is not owned by the member, check if it's publicly accessible
    if (!isOwner) {
      // For now, we'll allow access to all accounts, but in the future,
      // we might want to restrict access to certain account types
      logger.info("Non-owner accessing account dashboard", {
        memberID,
        accountID,
      });
    }

    // Get account details, balances, and transaction history
    const accountDetailsResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AccountInternal {id: $accountID})
         OPTIONAL MATCH (a)-[:PROFILE_PIC_ORIGINAL_JPG]->(originalPic:Asset)
         OPTIONAL MATCH (a)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:Asset)
         OPTIONAL MATCH (a)-[:PROFILE_PIC_200_JPG]->(pic200:Asset)
         OPTIONAL MATCH (a)-[:PROFILE_PIC_600_JPG]->(pic600:Asset)
         OPTIONAL MATCH (owner:Member)-[:OWNS]->(a)
         RETURN a, owner,
         originalPic.id as originalPicID,
         thumbnailPic.id as thumbnailPicID,
         pic200.id as pic200ID,
         pic600.id as pic600ID`,
        { accountID }
      );
    });

    // Get related product accounts
    const relatedProductsResult = await session.executeRead(async (tx: any) => {
      // If this is a store (OPERATIONS account), get products available in this store
      if (account.accountType === "OPERATIONS") {
        return await tx.run(
          `MATCH (a:AccountInternal {id: $accountID})
           MATCH (productAccount:AccountInternal)-[:AVAILABLE_IN]->(a)
           WHERE productAccount.accountType = 'PHYSICAL_ASSET'
           OPTIONAL MATCH (productAccount)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:Asset)
           RETURN productAccount, thumbnailPic.id as thumbnailPicID
           ORDER BY productAccount.accountName`,
          { accountID }
        );
      } else {
        // Otherwise, get products owned by the same member
        return await tx.run(
          `MATCH (a:AccountInternal {id: $accountID})
           MATCH (owner:Member)-[:AUTHORIZED_FOR]->(a)
           MATCH (owner)-[:OWNS]->(productAccount:AccountInternal)
           WHERE productAccount.accountType = 'PHYSICAL_ASSET'
           OPTIONAL MATCH (productAccount)-[:PROFILE_PIC_THUMBNAIL_JPG]->(thumbnailPic:Asset)
           RETURN productAccount, thumbnailPic.id as thumbnailPicID
           ORDER BY productAccount.accountName`,
          { accountID }
        );
      }
    });

    // Get recent transactions for this account
    const transactionsResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AccountInternal {id: $accountID})
         MATCH (a)<-[r:CREDITS_TO|DEBITS_FROM]-(tx:Transaction)
         WITH a, tx, r
         ORDER BY tx.createdAt DESC
         LIMIT 10
         MATCH (counterparty)-[counterRel:CREDITS_TO|DEBITS_FROM]->(tx)
         WHERE counterparty <> a
         RETURN tx, 
                type(r) as relationshipType,
                counterparty.accountName as counterpartyName,
                counterparty.id as counterpartyID
         ORDER BY tx.createdAt DESC`,
        { accountID }
      );
    });

    // Parse location if it's a string
    let location = account.location;
    if (typeof location === "string") {
      try {
        location = JSON.parse(location);
      } catch (e) {
        logger.warn("Failed to parse location data", {
          location,
          error: e instanceof Error ? e.message : "Unknown error",
        });
        location = null;
      }
    }

    // Format the account details
    const accountDetails = {
      accountID: account.id,
      accountName: account.accountName,
      accountHandle: account.accountHandle || "",
      accountDescription: account.accountDescription || "",
      accountType: account.accountType,
      storeOpen: account.storeOpen || false,
      location: location,
      owner: accountDetailsResult.records[0].get("owner")?.properties || null,
      profilePictures: {
        original: accountDetailsResult.records[0].get("originalPicID") || null,
        thumbnail:
          accountDetailsResult.records[0].get("thumbnailPicID") || null,
        pic200: accountDetailsResult.records[0].get("pic200ID") || null,
        pic600: accountDetailsResult.records[0].get("pic600ID") || null,
      },
    };

    // Format the related products
    const relatedProducts = relatedProductsResult.records.map((record: any) => {
      const product = record.get("productAccount").properties;
      return {
        productID: product.id,
        productName: product.accountName,
        productDescription: product.accountDescription || "",
        productHandle: product.accountHandle || "",
        thumbnailPicID: record.get("thumbnailPicID") || null,
      };
    });

    // Format the transactions
    const transactions = transactionsResult.records.map((record: any) => {
      const tx = record.get("tx").properties;
      const relationshipType = record.get("relationshipType");
      const counterpartyName = record.get("counterpartyName");
      const counterpartyID = record.get("counterpartyID");

      return {
        transactionID: tx.id,
        amount: tx.amount,
        denomination: tx.denomination,
        type: relationshipType === "CREDITS_TO" ? "Credit" : "Debit",
        counterparty: {
          accountID: counterpartyID,
          accountName: counterpartyName,
        },
        createdAt: tx.createdAt,
        description: tx.description || "",
      };
    });

    // Calculate balances
    const balances = {
      totalCredits: 0,
      totalDebits: 0,
      netBalance: 0,
    };

    // In a real implementation, we would calculate these from the database
    // For now, we'll just use placeholder values
    balances.totalCredits = 1000;
    balances.totalDebits = 500;
    balances.netBalance = balances.totalCredits - balances.totalDebits;

    res.status(200).json({
      message: "Account dashboard retrieved successfully",
      data: {
        action: {
          id: accountID,
          type: "ACCOUNT_DASHBOARD_RETRIEVED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            accountID,
            accountName: account.accountName,
          },
        },
        dashboard: {
          account: accountDetails,
          balances,
          transactions,
          relatedProducts,
        },
      },
    });
  } catch (error) {
    logger.error("Error in GetAccountDashboardController", {
      controller: "GetAccountDashboardController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
