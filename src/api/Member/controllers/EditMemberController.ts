import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { relationshipService } from "../../../services/relationships/relationshipService";

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

    const {
      firstname,
      lastname,
      memberHandle,
      vendorBio,
      profile_picture_original_jpg,
      profile_picture_200_jpg,
      profile_picture_600_jpg,
    } = req.body;

    const memberID = req.user?.memberID;

    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if any fields were provided for update
    if (
      !firstname &&
      !lastname &&
      !memberHandle &&
      vendorBio === undefined &&
      !profile_picture_original_jpg &&
      !profile_picture_200_jpg &&
      !profile_picture_600_jpg
    ) {
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

    // Execute the update query if there are fields to update
    let updatedMember;
    if (setClause.length > 0) {
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
      updatedMember = result.records[0].get("m").properties;
    } else {
      // If no fields to update, just get the current member data
      const result = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (m:Member {memberID: $memberID})
           RETURN m`,
          { memberID }
        );
      });

      if (result.records.length === 0) {
        throw new Error("Member not found");
      }

      updatedMember = result.records[0].get("m").properties;
    }

    // Handle profile picture relationships
    const profilePictureUpdates = [];

    if (profile_picture_original_jpg) {
      // First, check if there's an existing relationship and remove it
      const existingRelationships =
        await relationshipService.getAssetRelationships(
          session,
          memberID,
          "PROFILE_PIC_ORIGINAL_JPG"
        );

      if (existingRelationships.length > 0) {
        for (const rel of existingRelationships) {
          await relationshipService.disconnectAsset(
            session,
            memberID,
            rel.id,
            memberID,
            "PROFILE_PIC_ORIGINAL_JPG"
          );
        }
      }

      // Create the new relationship
      await relationshipService.connectAsset(
        session,
        memberID,
        profile_picture_original_jpg,
        memberID,
        "PROFILE_PIC_ORIGINAL_JPG"
      );

      profilePictureUpdates.push("original");
    }

    if (profile_picture_200_jpg) {
      // First, check if there's an existing relationship and remove it
      const existingRelationships =
        await relationshipService.getAssetRelationships(
          session,
          memberID,
          "PROFILE_PIC_200_JPG"
        );

      if (existingRelationships.length > 0) {
        for (const rel of existingRelationships) {
          await relationshipService.disconnectAsset(
            session,
            memberID,
            rel.id,
            memberID,
            "PROFILE_PIC_200_JPG"
          );
        }
      }

      // Create the new relationship
      await relationshipService.connectAsset(
        session,
        memberID,
        profile_picture_200_jpg,
        memberID,
        "PROFILE_PIC_200_JPG"
      );

      profilePictureUpdates.push("200px");
    }

    if (profile_picture_600_jpg) {
      // First, check if there's an existing relationship and remove it
      const existingRelationships =
        await relationshipService.getAssetRelationships(
          session,
          memberID,
          "PROFILE_PIC_600_JPG"
        );

      if (existingRelationships.length > 0) {
        for (const rel of existingRelationships) {
          await relationshipService.disconnectAsset(
            session,
            memberID,
            rel.id,
            memberID,
            "PROFILE_PIC_600_JPG"
          );
        }
      }

      // Create the new relationship
      await relationshipService.connectAsset(
        session,
        memberID,
        profile_picture_600_jpg,
        memberID,
        "PROFILE_PIC_600_JPG"
      );

      profilePictureUpdates.push("600px");
    }

    // Get profile picture information for the response
    let profilePictures = {};

    if (profilePictureUpdates.length > 0) {
      // Get the current profile pictures
      const profilePicOriginal =
        await relationshipService.getAssetRelationships(
          session,
          memberID,
          "PROFILE_PIC_ORIGINAL_JPG"
        );

      const profilePic200 = await relationshipService.getAssetRelationships(
        session,
        memberID,
        "PROFILE_PIC_200_JPG"
      );

      const profilePic600 = await relationshipService.getAssetRelationships(
        session,
        memberID,
        "PROFILE_PIC_600_JPG"
      );

      profilePictures = {
        original:
          profilePicOriginal.length > 0 ? profilePicOriginal[0].id : null,
        size200: profilePic200.length > 0 ? profilePic200[0].id : null,
        size600: profilePic600.length > 0 ? profilePic600[0].id : null,
      };
    }

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
            profilePictureUpdates:
              profilePictureUpdates.length > 0
                ? profilePictureUpdates
                : undefined,
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
            profilePictures:
              profilePictureUpdates.length > 0 ? profilePictures : undefined,
          },
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
