"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDigitalSignature = createDigitalSignature;
async function createDigitalSignature(session, memberID, entityType, entityId) {
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
//# sourceMappingURL=digitalSignature.js.map