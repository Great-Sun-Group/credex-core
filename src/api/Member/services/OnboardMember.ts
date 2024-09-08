import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { getDenominations } from "../../../constants/denominations";
import { isNeo4jError } from "../../../utils/errorUtils";

export async function OnboardMemberService(
  firstname: string,
  lastname: string,
  phone: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const defaultDenom = "USD";

  try {
    // Validation: Check defaultDenom in denominations
    if (!getDenominations({ code: defaultDenom }).length) {
      const message = "defaultDenom not in denoms";
      console.log(message);
      return { onboardedMemberID: false, message: message };
    }

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
      console.log(message);
      return { onboardedMemberID: false, message: message };
    }

    const memberID = result.records[0].get("memberID");

    console.log("member onboarded: " + memberID);
    return {
      onboardedMemberID: memberID,
      message: "member onboarded",
    };
  } catch (error) {
    console.error("Error onboarding member:", error);

    // Type guard to narrow the type of error
    if (
      isNeo4jError(error) &&
      error.code === "Neo.ClientError.Schema.ConstraintValidationFailed"
    ) {
      if (error.message.includes("phone")) {
        return {
          onboardedMemberID: false,
          message: "Phone number already in use",
        };
      }
      if (error.message.includes("memberHandle")) {
        return {
          onboardedMemberID: false,
          message: "Member handle already in use",
        };
      }
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
    await ledgerSpaceSession.close();
  }
}
