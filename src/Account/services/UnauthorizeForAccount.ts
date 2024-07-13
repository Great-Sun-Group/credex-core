import { ledgerSpaceDriver } from "../../../config/neo4j";

export async function UnauthorizeForCompanyService(
  humanIDtoBeUnauthorized: string,
  accountID: string,
  ownerID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH
                (humanToUnauthorize:Human { uniqueHumanID: $humanIDtoBeUnauthorized })
                -[authRel:AUTHORIZED_FOR]->(account:Account { accountID: $accountID })
                <-[:OWNS]-(owner:Human { uniqueHumanID: $ownerID })
            DELETE authRel
            RETURN
                account.accountID AS accountID,
                humanToUnauthorize.accountID AS humanToUnauthorize
        `,
      {
        humanIDtoBeUnauthorized,
        accountID,
        ownerID,
      }
    );

    if (!result.records.length) {
      console.log("could not unauthorize account");
      return false;
    }
    const record = result.records[0];

    console.log(
      `account ${record.get(
        "humanToUnauthorize"
      )} unauthorized to transact for ${record.get("accountID")}`
    );
    return true;
  } catch (error) {
    console.error("Error unauthorizing account:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
