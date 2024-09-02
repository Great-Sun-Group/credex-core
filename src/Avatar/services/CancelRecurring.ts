import { ledgerSpaceDriver } from "../../../config/neo4j";
import { denomFormatter } from "../../Core/constants/denominations";

export async function CancelRecurringService(
  signerID: string,
  cancelerAccountID: string,
  avatarID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // Validate and update the Recurring node
    const cancelRecurringQuery = await ledgerSpaceSession.run(
      `
      MATCH
        (signer:Member { memberID: $signerID })-[:AUTHORIZED_FOR]->
        (cancelingAccount:Account { accountID: $cancelerAccountID })-[rel1:ACTIVE|REQUESTS]-
        (recurring:Avatar { memberID: $avatarID})-[rel2:ACTIVE|REQUESTS]-
        (counterparty:Account)
      MATCH
        (cancelingAccount)<-[authRel1:AUTHORIZED_FOR]-
        (recurring)-[authRel2:AUTHORIZED_FOR]->
        (counterparty)
      WITH cancelingAccount, recurring, counterparty, rel1, rel2, authRel1, authRel2
      CALL apoc.create.relationship(cancelingAccount, 'CANCELED', {}, recurring) YIELD rel as canceledRel1
      CALL apoc.create.relationship(recurring, 'CANCELED', {}, counterparty) YIELD rel as canceledRel2
      DELETE rel1, rel2, authRel1, authRel2
      RETURN recurring.memberID AS deactivatedAvatarID
      `,
      {
        signerID,
        cancelerAccountID,
        avatarID,
      }
    );

    if (cancelRecurringQuery.records.length === 0) {
      return "Recurring template not found or not authorized to cancel";
    }

    const deactivatedAvatarID = cancelRecurringQuery.records[0].get(
      "deactivatedAvatarID"
    );

    return deactivatedAvatarID;
  } catch (error) {
    return error;
  } finally {
    await ledgerSpaceSession.close();
  }
}
