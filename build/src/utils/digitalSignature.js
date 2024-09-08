"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digitallySign = digitallySign;
exports.getSignerMember = getSignerMember;
async function digitallySign(session, signerID, entityType, entityId, actionType, inputData) {
    const query = `
    MATCH (signer:Member|Avatar {id: $signerID})
    MATCH (entity:${entityType} {id: $entityId})
    CREATE (signer)-[:SIGNED]->(signature:Signature {
      id: apoc.create.uuid(),
      createdAt: datetime(),
      actionType: $actionType,
      inputData: $inputData
    })-[:SIGNED]->(entity)
  `;
    await session.run(query, { signerID, entityId, actionType, inputData });
}
async function getSignerMember(session, signerID) {
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
//# sourceMappingURL=digitalSignature.js.map