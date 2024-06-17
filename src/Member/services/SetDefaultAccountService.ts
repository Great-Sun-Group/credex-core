/*
will only work on memberType == HUMAN
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function SetDefaultAccountService(
  memberID: string,
  defaultAccountID: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const SetDefaultAccountQuery = await ledgerSpaceSession.run(
    `
        MATCH (member:Member{memberID: $memberID, memberType: "HUMAN"})
          -[:OWNS|AUTHORIZED_FOR]->(newDefaultAccount:Member{memberID: $defaultAccountID})
        OPTIONAL MATCH (member)-[currentDefaultRel:DEFAULT_ACCOUNT]->(currentDefaultAccount)
        DELETE currentDefaultRel
        CREATE (member)-[:DEFAULT_ACCOUNT]->(newDefaultAccount)
        RETURN newDefaultAccount.memberID AS newDefaultAccountID
    `,
    {
      memberID,
      defaultAccountID,
    }
  );
  if (!SetDefaultAccountQuery.records[0]) {
    return false;
  }
  return true;
}
