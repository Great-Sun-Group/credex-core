import { ledgerSpaceDriver } from "../../../config/neo4j";
import { getDenominations } from "../../Core/constants/denominations";

export async function OnboardMemberService(
  firstname: string,
  lastname: string,
  memberHandle: string,
  defaultDenom: string,
  phone: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
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
          memberHandle: $memberHandle,
          defaultDenom: $defaultDenom,
          phone: $phone,
          memberID: randomUUID(),
          createdAt: datetime(),
          updatedAt: datetime()
        })-[:CREATED_ON]->(daynode)
        RETURN
          member.memberID AS memberID
      `,
      {
        firstname,
        lastname,
        memberHandle,
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

// Type guard to check if an error is a Neo4j error
function isNeo4jError(
  error: unknown
): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}