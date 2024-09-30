import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { generateToken } from "../../../../config/authenticate";
import logger from "../../../utils/logger";

export async function LoginMemberService(
  phone: string
): Promise<{ token?: string; error?: string }> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  logger.debug("Entering LoginMemberService", { phone });

  try {
    const result = await ledgerSpaceSession.executeWrite(async (tx) => {
      // First, find the member
      const memberResult = await tx.run(
        "MATCH (m:Member {phone: $phone}) RETURN m",
        { phone }
      );

      if (memberResult.records.length === 0) {
        logger.warn("Member not found", { phone });
        return { error: "Member not found" };
      }

      const member = memberResult.records[0].get("m").properties;
      
      // Ensure member.memberID exists
      if (!member.memberID) {
        logger.error("Member found but memberID is missing", { phone, member });
        return { error: "Invalid member data" };
      }

      const token = generateToken(member.memberID);

      // Then, update the token
      const updateResult = await tx.run(
        "MATCH (m:Member {memberID: $memberID}) SET m.token = $token RETURN m",
        { memberID: member.memberID, token }
      );

      // Verify the update was successful
      if (updateResult.records.length === 0) {
        logger.error("Failed to update member token", {
          phone,
          memberID: member.memberID,
        });
        return { error: "Failed to update member token" };
      }

      return { member, token };
    });

    if ('error' in result) {
      return result;
    }

    logger.info("Member logged in successfully", {
      phone,
      memberId: result.member.memberID,
    });
    return { token: result.token };
  } catch (error) {
    logger.error("Error in LoginMemberService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      phone,
    });
    return { error: "Internal server error" };
  } finally {
    await ledgerSpaceSession.close();
  }
}
