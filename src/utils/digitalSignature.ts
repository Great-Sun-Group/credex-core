import { Session } from "neo4j-driver";

export async function digitallySign(
  session: Session,
  signerID: string,
  entityType: string,
  entityId: string,
  actionType: string,
  inputData: string,
  requestId: string
): Promise<void> {
  const query = `
    MATCH (signer:Member|Avatar {id: $signerID})
    MATCH (entity:${entityType} {id: $entityId})
    CREATE (signer)-[:SIGNED]->(signature:Signature {
      id: apoc.create.uuid(),
      createdAt: datetime(),
      actionType: $actionType,
      inputData: $inputData,
      requestId: $requestId
    })-[:SIGNED]->(entity)
  `;

  await session.run(query, { signerID, entityId, actionType, inputData, requestId });
}

export async function getSignerMember(
  session: Session,
  signerID: string
): Promise<string> {
  const query = `
    MATCH (signer:Member|Avatar {id: $signerID})
    RETURN 
      CASE 
        WHEN signer:Member THEN signer.id 
        WHEN signer:Avatar THEN [(signer)<-[:OWNS]-(member:Member) | member.id][0]
      END AS memberID
  `;

  const result = await session.run(query, { signerID });
  return result.records[0].get('memberID');
}
