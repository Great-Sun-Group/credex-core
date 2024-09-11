import { searchSpaceDriver } from "../../../../config/neo4j";
import { generateToken } from "../../../../config/authenticate";
import logger from "../../../utils/logger";

export async function LoginMemberService(
  phone: string
): Promise<{ token?: string; error?: string }> {
  const session = searchSpaceDriver.session();
  logger.debug("Entering LoginMemberService", { phone });

  try {
    const result = await session.run(
      "MATCH (m:Member {phone: $phone}) RETURN m",
      { phone }
    );

    if (result.records.length === 0) {
      logger.warn("Member not found", { phone });
      return { error: "Member not found" };
    }

    const member = result.records[0].get("m").properties;
    const token = generateToken(member.id);

    // Update the token in the database
    await session.run("MATCH (m:Member {id: $id}) SET m.token = $token", {
      id: member.id,
      token,
    });

    logger.info("Member logged in successfully", {
      phone,
      memberId: member.id,
    });
    return { token };
  } catch (error) {
    logger.error("Error in LoginMemberService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      phone,
    });
    return { error: "Internal server error" };
  } finally {
    await session.close();
  }
}
