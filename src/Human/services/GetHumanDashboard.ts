import { ledgerSpaceDriver } from "../../Admin/config/neo4j";

export async function GetHumanDashboardService(phone: string) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
      MATCH (human:Human { phone: $phone })
      OPTIONAL MATCH (human)-[:AUTHORIZED_FOR]->(account:Account)
      WITH human, COLLECT(account.accountID) AS accountIDs
      RETURN
        human.uniqueHumanID AS uniqueHumanID,
        human.firstname AS firstname,
        human.lastname AS lastname,
        human.defaultDenom AS defaultDenom,
        [human.uniqueHumanID] + accountIDs AS authorizedFor
      `,
      { phone }
    );

    if (!result.records.length) {
      console.log("human not found by phone");
      return false;
    }

    return {
      uniqueHumanID: result.records[0].get("uniqueHumanID"),
      firstname: result.records[0].get("firstname"),
      lastname: result.records[0].get("lastname"),
      defaultDenom: result.records[0].get("defaultDenom"),
      authorizedFor: result.records[0].get("authorizedFor"),
    };
  } catch (error) {
    console.error("Error fetching account data:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
