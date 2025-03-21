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

    const { accountName, accountHandle, accountType, accountDescription } = req.body;
    const memberID = req.user?.id;
    
    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if the account handle is already in use
    const handleCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (a:AccountInternal {accountHandle: $accountHandle})
         RETURN a`,
        { accountHandle }
      );
    });

    if (handleCheckResult.records.length > 0) {
      throw new Error("Account handle is already in use");
    }

    // Create the account
    const accountID = uuidv4();
    const result = await session.executeWrite(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {id: $memberID})
         CREATE (a:AccountInternal {
           id: $accountID,
           accountName: $accountName,
           accountHandle: $accountHandle,
           accountType: $accountType,
           accountDescription: $accountDescription,
           createdAt: datetime()
         })
         CREATE (m)-[:OWNS]->(a)
         RETURN a`,
        { 
          memberID, 
          accountID, 
          accountName, 
          accountHandle, 
          accountType, 
          accountDescription: accountDescription || "" 
        }
      );
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
            accountHandle,
            accountType,
            accountDescription: accountDescription || "",
            ownerID: memberID,
          },
        },
        dashboard: {
          account: {
            id: accountID,
            accountName,
            accountHandle,
            accountType,
            accountDescription: accountDescription || "",
            ownerID: memberID,
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
