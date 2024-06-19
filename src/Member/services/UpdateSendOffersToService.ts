/*
updates the authorized member who will receive offer notifications
can only be executed by company owner

requires:
    memberID for human member to be authorized
    memberID for company
    memberID of human company owner as authorizer

on success returns true
on failure returns false
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function UpdateSendOffersToService(
  memberIDtoSendOffers: string,
  companyID: string,
  ownerID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

    try {
        const result = await ledgerSpaceSession.run(
          `
            MATCH
                (newMemberForOffers: Member { memberID: $memberIDtoSendOffers})
                -[:AUTHORIZED_FOR]->(company:Member { memberID: $companyID})
                <-[:OWNS]-(owner:Member { memberID: $ownerID}),
                (company)-[currentMemberForOffersRel:SEND_OFFERS_TO]->(:Member)
            DELETE currentMemberForOffersRel
            CREATE (company)-[:SEND_OFFERS_TO]->(newMemberForOffers)
            RETURN true
            `,
          {
            memberIDtoSendOffers,
            companyID,
            ownerID,
          }
        );

        if (!result.records.length) {
            return false;
        }

        return true;

    } catch (error) {
    console.error("Error updating member to receive offer notifications:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
