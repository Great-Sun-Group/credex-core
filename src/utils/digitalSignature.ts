import { Session } from "neo4j-driver";
import logger from "../utils/logger";

interface BulkOptions {
  additionalEntityIds: string[];
}

/**
 * Creates a digital signature node in the graph database
 * 
 * @param session - Neo4j session
 * @param signerID - ID of the member signing
 * @param entityType - Type of entity being signed (e.g., "Credex")
 * @param entityId - ID of the primary entity being signed
 * @param actionType - Type of action being signed
 * @param inputData - JSON string of data being signed
 * @param requestId - Request ID for tracking
 * @param bulkOptions - Optional parameter for bulk operations to link multiple entities to one signature
 */
export async function digitallySign(
  session: Session,
  signerID: string,
  entityType: string,
  entityId: string,
  actionType: string,
  inputData: string,
  requestId: string,
  bulkOptions?: BulkOptions
): Promise<void> {
  logger.debug("Attempting to create digital signature", {
    signerID,
    entityType,
    entityId,
    actionType,
    requestId,
    isBulkOperation: !!bulkOptions
  });
  
  const query = bulkOptions ? `
    MATCH (daynode:Daynode {Active: true})
    MATCH (signer:Member|Avatar {memberID: $signerID})
    MATCH (primaryEntity:${entityType} {${entityType.toLowerCase()}ID: $entityId})
    MATCH (additionalEntity:${entityType})
    WHERE additionalEntity.${entityType.toLowerCase()}ID IN $additionalEntityIds
    WITH daynode, signer, primaryEntity, collect(additionalEntity) as allEntities
    CREATE
      (signer)-[:SIGNED]->
      (signature:Signature {
        signatureID: apoc.create.uuid(),
        createdAt: datetime(),
        actionType: $actionType,
        inputData: $inputData,
        requestId: $requestId
      })-[:CREATED_ON]->(daynode)
    WITH signature, primaryEntity, allEntities
    CREATE (signature)-[:SIGNED]->(primaryEntity)
    WITH signature, allEntities
    UNWIND allEntities as entity
    CREATE (signature)-[:SIGNED]->(entity)
  ` : `
    MATCH (daynode:Daynode {Active: true})
    MATCH (signer:Member|Avatar {memberID: $signerID})
    MATCH (entity:${entityType} {${entityType.toLowerCase()}ID: $entityId})
    CREATE
      (signer)-[:SIGNED]->
      (signature:Signature {
        signatureID: apoc.create.uuid(),
        createdAt: datetime(),
        actionType: $actionType,
        inputData: $inputData,
        requestId: $requestId
      })-[:SIGNED]->(entity),
      (signature)-[:CREATED_ON]->(daynode)
  `;

  try {
    await session.run(query, {
      signerID,
      entityId,
      actionType,
      inputData,
      requestId,
      ...(bulkOptions && { additionalEntityIds: bulkOptions.additionalEntityIds })
    });
    
    logger.info("Digital signature created successfully", {
      signerID,
      entityType,
      entityId,
      actionType,
      requestId,
      additionalEntityCount: bulkOptions?.additionalEntityIds.length
    });
  } catch (error) {
    logger.error("Error creating digital signature", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      signerID,
      entityType,
      entityId,
      actionType,
      requestId,
      isBulkOperation: !!bulkOptions
    });
    throw error;
  }
}

export async function getSignerMember(
  session: Session,
  signerID: string
): Promise<string> {
  logger.debug("Attempting to get signer member", { signerID });

  const query = `
    MATCH (signer:Member|Avatar {memberID: $signerID})
    RETURN 
      CASE 
        WHEN signer:Member THEN signer.memberID 
        WHEN signer:Avatar THEN [(signer)<-[:OWNS]-(member:Member) | member.memberID][0]
      END AS memberID
  `;

  try {
    const result = await session.run(query, { signerID });
    const memberID = result.records[0].get("memberID");
    logger.info("Signer member retrieved successfully", { signerID, memberID });
    return memberID;
  } catch (error) {
    logger.error("Error getting signer member", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      signerID,
    });
    throw error;
  }
}
