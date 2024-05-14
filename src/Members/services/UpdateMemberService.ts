import { Member } from "../types/Member";

const neo4j = require("neo4j-driver");
const driverLedgerSpace = neo4j.driver(
  process.env.NEO_4J_LEDGER_SPACE_BOLT_URL,
  neo4j.auth.basic(
    process.env.NEO_4J_LEDGER_SPACE_USER,
    process.env.NEO_4J_LEDGER_SPACE_PASS
  ),
  {
    encrypted: true,
  }
);

export async function UpdateMemberService(data: Member) {
  const session = driverLedgerSpace.session();
  driverLedgerSpace.close();
  const updateQuery = await session.run(
    `
        MATCH (member:Member{memberID:$memberID})
        SET member += $updates
        RETURN member.memberID as memberID
        `,
    {
      ...data,
    }
  );

  return updateQuery.records[0].get("memberID");
}
