import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getDenominations } from "../../../constants/denominations";
import { isNeo4jError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

export async function OnboardMemberService(
  firstname: string,
  lastname: string,
  phone: string
) {
  logger.debug("OnboardMemberService called", { firstname, lastname, phone });
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const defaultDenom = "USD";

  try {
    // Validation: Check defaultDenom in denominations
    if (!getDenominations({ code: defaultDenom }).length) {
      const message = "defaultDenom not in denoms";
      logger.warn(message, { defaultDenom });
      return { onboardedMemberID: false, message: message };
    }

    logger.debug("Executing database query to create new member");
    const result = await ledgerSpaceSession.run(
      `
        MATCH (daynode:Daynode { Active: true })
        CREATE (member:Member{
          firstname: $firstname,
          lastname: $lastname,
          memberHandle: $phone,
          defaultDenom: $defaultDenom,
          phone: $phone,
          memberID: randomUUID(),
          memberTier: 1,
          createdAt: datetime(),
          updatedAt: datetime()
        })-[:CREATED_ON]->(daynode)
        RETURN
          member.memberID AS memberID
      `,
      {
        firstname,
        lastname,
        defaultDenom,
        phone,
      }
    );

    if (!result.records.length) {
      const message = "could not onboard member";
      logger.warn(message, { firstname, lastname, phone });
      return { onboardedMemberID: false, message: message };
    }

    const memberID = result.records[0].get("memberID");

    logger.info("Member onboarded successfully", {
      memberID,
      firstname,
      lastname,
      phone,
    });
    return {
      onboardedMemberID: memberID,
      message: "member onboarded",
    };
  } catch (error) {
    logger.error("Error onboarding member", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      firstname,
      lastname,
      phone,
    });

    // Type guard to narrow the type of error
    if (
      isNeo4jError(error) &&
      error.code === "Neo.ClientError.Schema.ConstraintValidationFailed"
    ) {
      if (error.message.includes("phone")) {
        logger.warn("Phone number already in use", { phone });
        return {
          onboardedMemberID: false,
          message: "Phone number already in use",
        };
      }
      if (error.message.includes("memberHandle")) {
        logger.warn("Member handle already in use", { phone });
        return {
          onboardedMemberID: false,
          message: "Member handle already in use",
        };
      }
      logger.warn("Required unique field not unique", { error: error.message });
      return {
        onboardedMemberID: false,
        message: "Required unique field not unique",
      };
    }

    return {
      onboardedMemberID: false,
      message:
        "Error: " + (error instanceof Error ? error.message : "Unknown error"),
    };
  } finally {
    logger.debug("Closing database session");
    await ledgerSpaceSession.close();
  }
}
