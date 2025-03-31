import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { v4 as uuidv4 } from "uuid";

/**
 * Controller for handling the creation of internal accounts
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function CreateAccountInternalController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();
  
  try {
    logger.info("CreateAccountInternalController called", {
      controller: "CreateAccountInternalController",
      body: req.body,
    });

    const { accountName, accountType, accountDescription, storeAccountID } = req.body;
    const memberID = req.user?.memberID;
    
    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if the account name is already in use by this member
    const nameCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {memberID: $memberID})-[:OWNS]->(a:AccountInternal {accountName: $accountName})
         RETURN a`,
        { memberID, accountName }
      );
    });

    if (nameCheckResult.records.length > 0) {
      throw new Error("Account name is already in use by this member");
    }

    // Create the account
    const accountID = uuidv4();
    const result = await session.executeWrite(async (tx: any) => {
      let query = `
        MATCH (m:Member {memberID: $memberID})
        CREATE (a:AccountInternal {
          id: $accountID,
          accountName: $accountName,
          accountType: $accountType,
          accountDescription: $accountDescription,
          createdAt: datetime()
        })
        CREATE (m)-[:OWNS]->(a)
      `;
      
      // If a store account ID is provided, create AVAILABLE_IN relationship
      if (storeAccountID) {
        query += `
          WITH a
          MATCH (store:AccountInternal {id: $storeAccountID})
          CREATE (a)-[:AVAILABLE_IN]->(store)
        `;
      }
      
      query += ` RETURN a`;
      
      return await tx.run(query, { 
        memberID, 
        accountID, 
        accountName, 
        accountType, 
        accountDescription: accountDescription || "",
        storeAccountID
      });
    });

    if (result.records.length === 0) {
      throw new Error("Failed to create internal account");
    }

    const account = result.records[0].get("a").properties;

    res.status(201).json({
      message: "Internal account created successfully",
      data: {
        action: {
          id: accountID,
          type: "ACCOUNT_INTERNAL_CREATED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            accountID,
            accountName,
            accountType,
            accountDescription: accountDescription || "",
            ownerID: memberID,
            storeAccountID: storeAccountID ? storeAccountID : undefined,
          },
        },
        dashboard: {
          account: {
            id: accountID,
            accountName,
            accountType,
            accountDescription: accountDescription || "",
            ownerID: memberID,
            availableIn: storeAccountID ? storeAccountID : undefined,
          }
        },
      },
    });
  } catch (error) {
    logger.error("Error in CreateAccountInternalController", {
      controller: "CreateAccountInternalController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
