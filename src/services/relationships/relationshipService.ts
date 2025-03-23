import { logInfo, logError } from "../../utils/logger";

/**
 * Service for managing relationships between assets and other nodes
 */
export class RelationshipService {
  /**
   * Connect an asset to another node with a specified relationship
   * @param session - Neo4j session
   * @param memberID - Member ID
   * @param assetID - Asset ID
   * @param connectedID - Connected node ID
   * @param relName - Relationship name
   * @returns The properties of the asset and connected node
   */
  public async connectAsset(
    session: any,
    memberID: string,
    assetID: string,
    connectedID: string,
    relName: string
  ): Promise<{ asset: any, connected: any, relType: string }> {
    try {
      // Check if the asset exists and is owned by the member
      const assetCheckResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (m:Member {id: $memberID})-[:OWNS]->()-[:CR|DR]-(:AssetMarker {id: $assetID})
           RETURN count(*) AS assetCount`,
          { memberID, assetID }
        );
      });

      const assetCount = assetCheckResult.records[0].get("assetCount").toNumber();
      if (assetCount === 0) {
        throw new Error("Asset not found or not owned by the member");
      }

      // Check if the connected node exists and is owned by the member
      const connectedCheckResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (m:Member {id: $memberID})-[:OWNS]->(n)
           WHERE n.id = $connectedID
           RETURN n`,
          { memberID, connectedID }
        );
      });

      if (connectedCheckResult.records.length === 0) {
        throw new Error("Connected node not found or not owned by the member");
      }

      // Check if the relationship already exists
      const relCheckResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})-[r:${relName}]->(n {id: $connectedID})
           RETURN count(r) AS relCount`,
          { assetID, connectedID, relName }
        );
      });

      const relCount = relCheckResult.records[0].get("relCount").toNumber();
      if (relCount > 0) {
        throw new Error(`Relationship ${relName} already exists between the asset and the connected node`);
      }

      // Create the relationship
      const result = await session.executeWrite(async (tx: any) => {
        return await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})
           MATCH (n {id: $connectedID})
           CREATE (a)-[r:${relName}]->(n)
           RETURN a, n, type(r) AS relType`,
          { assetID, connectedID }
        );
      });

      if (result.records.length === 0) {
        throw new Error("Failed to create relationship");
      }

      const asset = result.records[0].get("a").properties;
      const connected = result.records[0].get("n").properties;
      const relType = result.records[0].get("relType");

      logInfo(`Connected asset ${assetID} to ${connectedID} with relationship ${relName}`, {
        service: "RelationshipService",
        method: "connectAsset",
        assetID,
        connectedID,
        relName
      });

      return { asset, connected, relType };
    } catch (error) {
      logError("Error connecting asset", error instanceof Error ? error : new Error(String(error)), {
        service: "RelationshipService",
        method: "connectAsset",
        assetID,
        connectedID,
        relName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Disconnect an asset from another node
   * @param session - Neo4j session
   * @param memberID - Member ID
   * @param assetID - Asset ID
   * @param connectedID - Connected node ID
   * @param relName - Relationship name
   * @returns The properties of the asset and connected node
   */
  public async disconnectAsset(
    session: any,
    memberID: string,
    assetID: string,
    connectedID: string,
    relName: string
  ): Promise<{ asset: any, connected: any }> {
    try {
      // Check if the asset exists and is owned by the member
      const assetCheckResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (m:Member {id: $memberID})-[:OWNS]->()-[:CR|DR]-(:AssetMarker {id: $assetID})
           RETURN count(*) AS assetCount`,
          { memberID, assetID }
        );
      });

      const assetCount = assetCheckResult.records[0].get("assetCount").toNumber();
      if (assetCount === 0) {
        throw new Error("Asset not found or not owned by the member");
      }

      // Check if the connected node exists and is owned by the member
      const connectedCheckResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (m:Member {id: $memberID})-[:OWNS]->(n)
           WHERE n.id = $connectedID
           RETURN n`,
          { memberID, connectedID }
        );
      });

      if (connectedCheckResult.records.length === 0) {
        throw new Error("Connected node not found or not owned by the member");
      }

      // Check if the relationship exists
      const relCheckResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})-[r:${relName}]->(n {id: $connectedID})
           RETURN a, n, count(r) AS relCount`,
          { assetID, connectedID, relName }
        );
      });

      const relCount = relCheckResult.records[0].get("relCount").toNumber();
      if (relCount === 0) {
        throw new Error(`Relationship ${relName} does not exist between the asset and the connected node`);
      }

      const asset = relCheckResult.records[0].get("a").properties;
      const connected = relCheckResult.records[0].get("n").properties;

      // Delete the relationship
      const result = await session.executeWrite(async (tx: any) => {
        return await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})-[r:${relName}]->(n {id: $connectedID})
           DELETE r
           RETURN count(r) AS deletedCount`,
          { assetID, connectedID }
        );
      });

      const deletedCount = result.records[0].get("deletedCount").toNumber();
      if (deletedCount === 0) {
        throw new Error("Failed to delete relationship");
      }

      logInfo(`Disconnected asset ${assetID} from ${connectedID} with relationship ${relName}`, {
        service: "RelationshipService",
        method: "disconnectAsset",
        assetID,
        connectedID,
        relName
      });

      return { asset, connected };
    } catch (error) {
      logError("Error disconnecting asset", error instanceof Error ? error : new Error(String(error)), {
        service: "RelationshipService",
        method: "disconnectAsset",
        assetID,
        connectedID,
        relName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get all relationships of a specific type for an asset
   * @param session - Neo4j session
   * @param assetID - Asset ID
   * @param relName - Relationship name
   * @returns The connected nodes
   */
  public async getAssetRelationships(
    session: any,
    assetID: string,
    relName: string
  ): Promise<any[]> {
    try {
      const result = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})-[:${relName}]->(n)
           RETURN n`,
          { assetID, relName }
        );
      });

      return result.records.map((record: any) => record.get("n").properties);
    } catch (error) {
      logError("Error getting asset relationships", error instanceof Error ? error : new Error(String(error)), {
        service: "RelationshipService",
        method: "getAssetRelationships",
        assetID,
        relName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check if a relationship exists between an asset and another node
   * @param session - Neo4j session
   * @param assetID - Asset ID
   * @param connectedID - Connected node ID
   * @param relName - Relationship name
   * @returns True if the relationship exists
   */
  public async relationshipExists(
    session: any,
    assetID: string,
    connectedID: string,
    relName: string
  ): Promise<boolean> {
    try {
      const result = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})-[r:${relName}]->(n {id: $connectedID})
           RETURN count(r) AS relCount`,
          { assetID, connectedID, relName }
        );
      });

      return result.records[0].get("relCount").toNumber() > 0;
    } catch (error) {
      logError("Error checking relationship existence", error instanceof Error ? error : new Error(String(error)), {
        service: "RelationshipService",
        method: "relationshipExists",
        assetID,
        connectedID,
        relName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Export a singleton instance
export const relationshipService = new RelationshipService();
