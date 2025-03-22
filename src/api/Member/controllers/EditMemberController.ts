import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";

/**
 * Controller for handling member profile updates including vendor-specific details
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function EditMemberController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();
  
  try {
    logger.info("EditMemberController called", {
      controller: "EditMemberController",
      body: req.body,
    });

    const { firstname, lastname, memberHandle, vendorBio } = req.body;
    const memberID = req.user?.memberID;
    
    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if any fields were provided for update
    if (!firstname && !lastname && !memberHandle && vendorBio === undefined) {
      throw new Error("No fields provided for update");
    }

    // Build the update query dynamically based on provided fields
    let setClause = [];
    const params: Record<string, any> = { memberID };

    if (firstname) {
      setClause.push("m.firstname = $firstname");
      params.firstname = firstname;
    }

    if (lastname) {
      setClause.push("m.lastname = $lastname");
      params.lastname = lastname;
    }

    if (memberHandle) {
      // Check if the handle is already in use by another member
      const handleCheckResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (m:Member {memberHandle: $memberHandle})
           WHERE m.memberID <> $memberID
           RETURN m`,
          { memberHandle, memberID }
        );
      });

      if (handleCheckResult.records.length > 0) {
        throw new Error("Member handle is already in use");
      }

      setClause.push("m.memberHandle = $memberHandle");
      params.memberHandle = memberHandle;
    }

    if (vendorBio !== undefined) {
      setClause.push("m.vendorBio = $vendorBio");
      params.vendorBio = vendorBio;
    }

    // Execute the update query
    const result = await session.executeWrite(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {memberID: $memberID})
         SET ${setClause.join(", ")}
         RETURN m`,
        params
      );
    });

    if (result.records.length === 0) {
      throw new Error("Member not found");
    }

    // Get the updated member data
    const updatedMember = result.records[0].get("m").properties;

    res.status(200).json({
      message: "Member profile updated successfully",
      data: {
        action: {
          id: memberID,
          type: "MEMBER_UPDATED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            memberID,
            firstname: updatedMember.firstname,
            lastname: updatedMember.lastname,
            memberHandle: updatedMember.memberHandle,
            vendorBio: updatedMember.vendorBio,
          },
        },
        dashboard: {
          // Include relevant dashboard data here
          member: {
            memberID: memberID,
            firstname: updatedMember.firstname,
            lastname: updatedMember.lastname,
            memberHandle: updatedMember.memberHandle,
            vendorBio: updatedMember.vendorBio,
          }
        },
      },
    });
  } catch (error) {
    logger.error("Error in EditMemberController", {
      controller: "EditMemberController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
