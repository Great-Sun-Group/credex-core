import { getCurrencyDenominations } from "../constants/denominations";
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

export async function CreateMemberService(memberData: Member) {
  const dataForCreate = { ...memberData };

  if (
    dataForCreate.memberType &&
    dataForCreate.defaultDenom &&
    dataForCreate.handle
  ) {
    const sessionLedgerSpace = driverLedgerSpace.session();
    const createMemberQuery = await sessionLedgerSpace.run(
      `
            MATCH (daynode:DayNode{Active:true})
            CREATE (member:Member)-[:CREATED_ON]->(daynode)
            SET
                member += $dataForCreate,
                member.memberID = randomUUID(),
                member.queueStatus = "PENDING_MEMBER",
                member.createdAt = datetime(),
                member.updatedAt = datetime(),
                member.memberSince = datetime()
            RETURN member.memberID AS memberID    
        `,
      {
        dataForCreate,
      }
    );
    sessionLedgerSpace.close();

    return createMemberQuery.records[0].get("memberID");
  } else {
    return false;
  }
}
