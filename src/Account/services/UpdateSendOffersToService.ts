/*
updates the authorized account who will receive offer notifications
can only be executed by company owner

requires:
    accountID for human account to be authorized
    accountID for company
    accountID of human company owner as authorizer

on success returns true
on failure returns false
*/

import { ledgerSpaceDriver } from "../../Admin/config/neo4j";

export async function UpdateSendOffersToService(
  accountIDtoSendOffers: string,
  companyID: string,
  ownerID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH
                (newAccountForOffers: Account { accountID: $accountIDtoSendOffers})
                -[:AUTHORIZED_FOR]->(company:Account { accountID: $companyID})
                <-[:OWNS]-(owner:Account { accountID: $ownerID}),
                (company)-[currentAccountForOffersRel:SEND_OFFERS_TO]->(:Account)
            DELETE currentAccountForOffersRel
            CREATE (company)-[:SEND_OFFERS_TO]->(newAccountForOffers)
            RETURN true
            `,
      {
        accountIDtoSendOffers,
        companyID,
        ownerID,
      }
    );

    if (!result.records.length) {
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Error updating account to receive offer notifications:",
      error
    );
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
