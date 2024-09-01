import { ledgerSpaceDriver } from "../../../config/neo4j";
import { denomFormatter } from "../../Core/constants/denominations";

export async function CancelRecurringService(
  memberID: string,
  cancelerAccountID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Validate and update the Recurring node
    const cancelRecurringQuery = await ledgerSpaceSession.run(
      `
      MATCH (canceler:Account {accountID: $cancelerAccountID})
      MATCH (recurring:Recurring {memberID: $memberID})
      WHERE (canceler)<-[:REQUESTS|ACTIVE_AUTHORIZATION]-(recurring) OR (recurring)-[:REQUESTS|ACTIVE_AUTHORIZATION]->(canceler)
      WITH canceler, recurring
      OPTIONAL MATCH (recurring)-[r:REQUESTS|ACTIVE_AUTHORIZATION]-()
      DELETE r
      MERGE (canceler)<-[:CANCELED_AUTHORIZATION]-(recurring)-[:CANCELED_AUTHORIZATION]->(otherAccount)
      WHERE otherAccount <> canceler
      RETURN
        recurring.memberID AS memberID,
        recurring.Denomination AS Denomination,
        recurring.InitialAmount AS InitialAmount,
        recurring.nextPayDate AS nextPayDate,
        recurring.daysBetweenPays AS daysBetweenPays,
        recurring.remainingPays AS remainingPays,
        otherAccount.accountName AS otherAccountName
      `,
      {
        memberID,
        cancelerAccountID,
      }
    );

    if (cancelRecurringQuery.records.length === 0) {
      return {
        recurring: false,
        message: "Recurring template not found or not authorized to cancel",
      };
    }

    const record = cancelRecurringQuery.records[0];
    const updatedRecurring = {
      memberID: record.get("memberID"),
      formattedInitialAmount: denomFormatter(
        record.get("InitialAmount"),
        record.get("Denomination")
      ),
      otherAccountName: record.get("otherAccountName"),
      nextPayDate: record.get("nextPayDate"),
      daysBetweenPays: record.get("daysBetweenPays"),
      remainingPays: record.get("remainingPays") || "Indefinite",
    };

    return {
      recurring: updatedRecurring,
      message: "Recurring template canceled: " + updatedRecurring.memberID,
    };
  } catch (error) {
    return {
      recurring: false,
      message: "Error canceling recurring template: " + error,
    };
  } finally {
    await ledgerSpaceSession.close();
  }
}
