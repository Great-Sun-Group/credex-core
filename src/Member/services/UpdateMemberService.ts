import { Member } from "../types/Member";
import { sessionLedgerSpace } from "../../config/neo4j/neo4j";

export async function UpdateMemberService(data: Member) {
  const updateQuery = await sessionLedgerSpace.run(
    `
        MATCH (member:Member{memberID:$memberID})
        SET member += $data
        RETURN member.memberID as memberID
        `,
    {
      ...data,
    }
  );
  await sessionLedgerSpace.close(); 

  return updateQuery.records[0].get("memberID");
}
