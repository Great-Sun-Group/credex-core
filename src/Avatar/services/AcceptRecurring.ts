import { ledgerSpaceDriver } from "../../../config/neo4j";
import { denomFormatter } from "../../Core/constants/denominations";

export async function AcceptRecurringService(
  memberID: string,
  acceptorAccountID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Validate and update the Recurring node
    const acceptRecurringQuery = await ledgerSpaceSession.run(
      `
      MATCH (acceptor:Account {accountID: $acceptorAccountID})
      MATCH (recurring:Recurring {memberID: $memberID})
      WHERE (acceptor)<-[:REQUESTS]-(recurring) OR (recurring)-[:REQUESTS]->(acceptor)
      WITH acceptor, recurring
      OPTIONAL MATCH (recurring)-[r:REQUESTS]-()
      DELETE r
      MERGE (acceptor)<-[:ACTIVE_AUTHORIZATION]-(recurring)-[:ACTIVE_AUTHORIZATION]->(otherAccount)
      WHERE otherAccount <> acceptor
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
        acceptorAccountID,
      }
    );

    if (acceptRecurringQuery.records.length === 0) {
      return {
        recurring: false,
        message: "Recurring template not found or not authorized to accept",
      };
    }

    const record = acceptRecurringQuery.records[0];
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
      message: "Recurring template accepted: " + updatedRecurring.memberID,
    };
  } catch (error) {
    return {
      recurring: false,
      message: "Error accepting recurring template: " + error,
    };
  } finally {
    await ledgerSpaceSession.close();
  }
}
