import { Session } from 'neo4j-driver';

export async function createDigitalSignature(
  session: Session,
  memberID: string,
  entityType: string,
  entityId: string
): Promise<void> {
  const query = `
    MATCH (signer:Member|Avatar {id: $memberID})
    MATCH (entity:${entityType} {id: $entityId})
    CREATE (signer)-[:SIGNED]->(signature:Signature {
      id: apoc.create.uuid(),
      createdAt: datetime()
    })-[:SIGNED]->(entity)
  `;

  await session.run(query, { memberID, entityId });
}