import { ledgerSpaceDriver } from "../../../config/neo4j";
import { getDenominations } from "../../Core/constants/denominations";

export async function OnboardHumanService(
  firstname: string,
  lastname: string,
  handle: string,
  defaultDenom: string,
  phone: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    // Validation: Check defaultDenom in denominations
    if (!getDenominations({ code: defaultDenom }).length) {
      const message = "defaultDenom not in denoms";
      console.log(message);
      return { onboardedHumanID: false, message: message };
    }

    const result = await ledgerSpaceSession.run(
      `
        MATCH (daynode:Daynode { Active: true })
        CREATE (human:Human{
          firstname: $firstname,
          lastname: $lastname,
          defaultDenom: $defaultDenom,
          phone: $phone,
          uniqueHumanID: randomUUID(),
          queueStatus: "PENDING_ACCOUNT",
          createdAt: datetime(),
          updatedAt: datetime()
        })-[:CREATED_ON]->(daynode)
        RETURN
          human.uniqueHumanID AS uniqueHumanID
      `,
      {
        firstname,
        lastname,
        handle,
        defaultDenom,
        phone,
      }
    );

    if (!result.records.length) {
      const message = "could not onboard human";
      console.log(message);
      return { onboardedHumanID: false, message: message };
    }

    const uniqueHumanID = result.records[0].get("uniqueHumanID");

    console.log("human onboarded: " + uniqueHumanID);
    return {
      onboardedHumanID: uniqueHumanID,
      message: "human onboarded",
    };
  } catch (error) {
    console.error("Error onboarding human:", error);

    // Type guard to narrow the type of error
    if (
      isNeo4jError(error) &&
      error.code === "Neo.ClientError.Schema.ConstraintValidationFailed"
    ) {
      if (error.message.includes("phone")) {
        return {
          onboardedHumanID: false,
          message: "Phone number already in use",
        };
      }
      return {
        onboardedHumanID: false,
        message: "Required unique field not unique",
      };
    }

    return {
      onboardedHumanID: false,
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
