import { ledgerSpaceDriver } from "../../../../config/neo4j";

export async function UpdateSendOffersToService(
  memberIDtoSendOffers: string,
  accountID: string,
  ownerID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH
                (newMemberForOffers: Member { memberID: $memberIDtoSendOffers})
                -[:AUTHORIZED_FOR]->(account:Account { accountID: $accountID})
                <-[:OWNS]-(owner:Member { memberID: $ownerID}),
                (account)-[currentAccountForOffersRel:SEND_OFFERS_TO]->(:Member)
            DELETE currentAccountForOffersRel
            CREATE (account)-[:SEND_OFFERS_TO]->(newMemberForOffers)
            RETURN true
            `,
      {
        memberIDtoSendOffers,
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
