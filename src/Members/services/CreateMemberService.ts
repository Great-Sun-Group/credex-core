import { sessionLedgerSpace } from "../../config/neo4j/neo4j";
import { getCurrencyDenominations } from "../constants/denominations";
import { Member } from "../types/Member";


export async function CreateMemberService(memberData: Member) {
  const dataForCreate = { ...memberData };

  if (
    dataForCreate.memberType &&
    dataForCreate.defaultDenom &&
    dataForCreate.handle
  ) {
    const createMemberQuery = await sessionLedgerSpace.run(
      `
            MATCH (daynode:DayNode{Active:true})
            CREATE (member:Member)-[:CREATED_ON]->(daynode)
            SET
                member += $dataForCreate,
                member.memberID = randomUUID(),
                member.queueStatus = "PENDING_MEMBER",
                member.createdAt = datetime(),
                member.updatedAt = datetime()
            RETURN member.memberID AS memberID    
        `,
      {
        dataForCreate,
      }
    );
    sessionLedgerSpace.close();
    console.log(
      "member created: " + createMemberQuery.records[0].get("memberID")
    );

    return createMemberQuery.records[0].get("memberID");
  } else {
    return false;
  }
}
