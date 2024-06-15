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
        OPTIONAL MATCH (member)-[currentDefaultRel:DEFAULT_ACCOUNT]->(currentDefaultAccount)
        DELETE currentDefaultRel
        WITH member
        MATCH (defaultAccount:Member{memberID: $defaultAccountID})
        CREATE (member)-[:DEFAULT_ACCOUNT]->(defaultAccount)
        RETURN true AS result
    `,
    {
      memberID,
      defaultAccountID,
    }
  );
  if (!SetDefaultAccountQuery.records[0].get("result")) {
    return false;
  }
  return true;
}
