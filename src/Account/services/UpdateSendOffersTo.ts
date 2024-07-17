import { ledgerSpaceDriver } from "../../../config/neo4j";

export async function UpdateSendOffersToService(
  humanIDtoSendOffers: string,
  accountID: string,
  ownerID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH
                (newHumanForOffers: Human { uniqueHumanID: $humanIDtoSendOffers})
                -[:AUTHORIZED_FOR]->(account:Account { accountID: $companyID})
                <-[:OWNS]-(owner:Human { uniqueHumanID: $ownerID}),
                (company)-[currentAccountForOffersRel:SEND_OFFERS_TO]->(:Account)
            DELETE currentAccountForOffersRel
            CREATE (account)-[:SEND_OFFERS_TO]->(newHumanForOffers)
            RETURN true
            `,
      {
        humanIDtoSendOffers,
        accountID,
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
