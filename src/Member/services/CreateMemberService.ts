import { sessionLedgerSpace } from "../../config/neo4j/neo4j";
import { getDenominations } from "../../Ecosystem/constants/denominations";
import { Member } from "../types/Member";


export async function CreateMemberService(memberData: Member) {
  const dataForCreate = { ...memberData };
  const denomCodes = getDenominations({formatAsList:true}) //for commented out code below

  if (
    dataForCreate.memberType &&
    dataForCreate.defaultDenom &&
    //want to use the below instead of the above to check if denom permitted, but TS doesn't like it
    //denomCodes.includes(dataForCreate.defaultDenom) &&
    dataForCreate.handle.toLowerCase()
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
    await sessionLedgerSpace.close();
    console.log(
      "member created: " + createMemberQuery.records[0].get("memberID")
    );

    return createMemberQuery.records[0].get("memberID");
  } else {
    return false;
  }
}
