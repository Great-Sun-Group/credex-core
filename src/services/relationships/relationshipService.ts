import { logInfo, logError } from "../../utils/logger";

/**
 * Service for managing relationships between assets and other nodes
 */
export class RelationshipService {
  /**
   * Verify if a node is accessible to a member (is the member or directly owned by member)
   * @param session - Neo4j session
   * @param memberID - Member ID
   * @param nodeID - Node ID to verify
   * @returns The node if accessible, null otherwise
   */
  private async verifyNodeAccess(
    session: any,
    memberID: string,
    nodeID: string
  ): Promise<any | null> {
    try {
      logInfo(`Starting verifyNodeAccess`, {
        service: "RelationshipService",
        method: "verifyNodeAccess",
        memberID,
        nodeID
      });
      
      // First, try to find the node directly
      const findNodeResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (node)
           WHERE node.id = $nodeID OR node.memberID = $nodeID OR node.accountID = $nodeID
           RETURN node`,
          { nodeID }
        );
      });

      // If node not found by ID, return null
      if (findNodeResult.records.length === 0) {
        logInfo(`Node not found with ID: ${nodeID}`, {
          service: "RelationshipService",
          method: "verifyNodeAccess",
          nodeID
        });
        return null;
      }

      const node = findNodeResult.records[0].get("node");
      
      logInfo(`Found node with labels: ${JSON.stringify(node.labels)}`, {
        service: "RelationshipService",
        method: "verifyNodeAccess",
        nodeID,
        nodeLabels: node.labels,
        nodeProperties: node.properties
      });

      // If the node is a Member node with the matching memberID, it's accessible
      if (
        node.labels.includes("Member") &&
        node.properties.memberID === memberID
      ) {
        logInfo(`Node is a Member node with matching memberID`, {
          service: "RelationshipService",
          method: "verifyNodeAccess",
          nodeID,
          memberID
        });
        return node;
      }

      // Check if the member owns the node (checking multiple ID fields)
      const ownershipResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (m:Member {memberID: $memberID})-[:OWNS]->(node)
           WHERE node.id = $nodeID OR node.memberID = $nodeID OR node.accountID = $nodeID
           RETURN node`,
          { memberID, nodeID }
        );
      });

      if (ownershipResult.records.length > 0) {
        logInfo(`Member owns the node`, {
          service: "RelationshipService",
          method: "verifyNodeAccess",
          nodeID,
          memberID
        });
        return ownershipResult.records[0].get("node");
      }

      logInfo(`Node not accessible by member`, {
        service: "RelationshipService",
        method: "verifyNodeAccess",
        nodeID,
        memberID
      });
      return null;
    } catch (error) {
      logError(
        "Error verifying node access",
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "RelationshipService",
          method: "verifyNodeAccess",
          memberID,
          nodeID,
          error: error instanceof Error ? error.message : String(error),
        }
      );
      return null;
    }
  }

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
  ): Promise<{ asset: any; connected: any; relType: string }> {
    try {
      logInfo(`Starting connectAsset`, {
        service: "RelationshipService",
        method: "connectAsset",
        memberID,
        assetID,
        connectedID,
        relName,
      });

      // Verify asset node access
      const assetNode = await this.verifyNodeAccess(session, memberID, assetID);
      if (!assetNode) {
        throw new Error("Asset node not found or not accessible by the member");
      }

      // Verify connected node access
      const connectedNode = await this.verifyNodeAccess(
        session,
        memberID,
        connectedID
      );
      if (!connectedNode) {
        throw new Error(
          "Connected node not found or not accessible by the member"
        );
      }

      // Check if the relationship already exists
      const relationshipExists = await this.relationshipExists(
        session,
        assetID,
        connectedID,
        relName
      );

      if (relationshipExists) {
        throw new Error(
          `Relationship ${relName} already exists between the asset and the connected node`
        );
      }

      // Create the relationship
      const result = await session.executeWrite(async (tx: any) => {
        return await tx.run(
          `MATCH (a)
           WHERE a.id = $assetID OR a.memberID = $assetID OR a.accountID = $assetID
           MATCH (n)
           WHERE n.id = $connectedID OR n.memberID = $connectedID OR n.accountID = $connectedID
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

      logInfo(
        `Connected asset ${assetID} to ${connectedID} with relationship ${relName}`,
        {
          service: "RelationshipService",
          method: "connectAsset",
          assetID,
          connectedID,
          relName,
        }
      );

      return { asset, connected, relType };
    } catch (error) {
      logError(
        "Error connecting asset",
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "RelationshipService",
          method: "connectAsset",
          assetID,
          connectedID,
          relName,
          error: error instanceof Error ? error.message : String(error),
        }
      );
      throw error;
    }
  }

  /**
   * Connect multiple assets to a node with specified relationships
   * @param session - Neo4j session
   * @param memberID - Member ID
   * @param connections - Array of connections with assetID, connectedID, and relName
   * @returns Array of connection results
   */
  public async connectMultipleAssets(
    session: any,
    memberID: string,
    connections: Array<{
      assetID: string;
      connectedID: string;
      relName: string;
    }>
  ): Promise<
    Array<{ asset: any; connected: any; relType: string; error?: string }>
  > {
    try {
      const results = [];

      // Process each connection
      for (const connection of connections) {
        const { assetID, connectedID, relName } = connection;

        try {
          // For each connection, first check if there's an existing relationship and remove it
          const existingRelationships = await this.getAssetRelationships(
            session,
            connectedID,
            relName
          );

          if (existingRelationships.length > 0) {
            for (const rel of existingRelationships) {
              await this.disconnectAsset(
                session,
                memberID,
                rel.id,
                connectedID,
                relName
              );
            }
          }

          // Create the new relationship
          const result = await this.connectAsset(
            session,
            memberID,
            assetID,
            connectedID,
            relName
          );

          results.push(result);
        } catch (error) {
          logError(
            `Error connecting asset ${assetID} to ${connectedID} with relationship ${relName}`,
            error instanceof Error ? error : new Error(String(error)),
            {
              service: "RelationshipService",
              method: "connectMultipleAssets",
              assetID,
              connectedID,
              relName,
              error: error instanceof Error ? error.message : String(error),
            }
          );

          // Continue with other connections even if one fails
          results.push({
            asset: { id: assetID },
            connected: { id: connectedID },
            relType: relName,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logInfo(`Connected ${results.length} assets`, {
        service: "RelationshipService",
        method: "connectMultipleAssets",
        connectionCount: connections.length,
        successCount: results.filter((r) => !("error" in r)).length,
      });

      return results;
    } catch (error) {
      logError(
        "Error connecting multiple assets",
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "RelationshipService",
          method: "connectMultipleAssets",
          error: error instanceof Error ? error.message : String(error),
        }
      );
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
  ): Promise<{ asset: any; connected: any }> {
    try {
      logInfo(`Starting disconnectAsset`, {
        service: "RelationshipService",
        method: "disconnectAsset",
        memberID,
        assetID,
        connectedID,
        relName,
      });

      // Verify asset node access
      const assetNode = await this.verifyNodeAccess(session, memberID, assetID);
      if (!assetNode) {
        throw new Error("Asset node not found or not accessible by the member");
      }

      // Verify connected node access
      const connectedNode = await this.verifyNodeAccess(
        session,
        memberID,
        connectedID
      );
      if (!connectedNode) {
        throw new Error(
          "Connected node not found or not accessible by the member"
        );
      }

      // Check if the relationship exists
      const result = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (a)
           WHERE a.id = $assetID OR a.memberID = $assetID OR a.accountID = $assetID
           MATCH (n)
           WHERE n.id = $connectedID OR n.memberID = $connectedID OR n.accountID = $connectedID
           OPTIONAL MATCH (a)-[r:${relName}]->(n)
           RETURN a, n, count(r) AS relCount`,
          { assetID, connectedID, relName }
        );
      });

      const relCount = result.records[0].get("relCount").toNumber();
      if (relCount === 0) {
        throw new Error(
          `Relationship ${relName} does not exist between the asset and the connected node`
        );
      }

      const asset = result.records[0].get("a").properties;
      const connected = result.records[0].get("n").properties;

      // Delete the relationship
      const deleteResult = await session.executeWrite(async (tx: any) => {
        return await tx.run(
          `MATCH (a)
           WHERE a.id = $assetID OR a.memberID = $assetID OR a.accountID = $assetID
           MATCH (n)
           WHERE n.id = $connectedID OR n.memberID = $connectedID OR n.accountID = $connectedID
           MATCH (a)-[r:${relName}]->(n)
           DELETE r
           RETURN count(r) AS deletedCount`,
          { assetID, connectedID }
        );
      });

      const deletedCount = deleteResult.records[0]
        .get("deletedCount")
        .toNumber();
      if (deletedCount === 0) {
        throw new Error("Failed to delete relationship");
      }

      logInfo(
        `Disconnected asset ${assetID} from ${connectedID} with relationship ${relName}`,
        {
          service: "RelationshipService",
          method: "disconnectAsset",
          assetID,
          connectedID,
          relName,
        }
      );

      return { asset, connected };
    } catch (error) {
      logError(
        "Error disconnecting asset",
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "RelationshipService",
          method: "disconnectAsset",
          assetID,
          connectedID,
          relName,
          error: error instanceof Error ? error.message : String(error),
        }
      );
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
      logInfo(`Getting asset relationships`, {
        service: "RelationshipService",
        method: "getAssetRelationships",
        assetID,
        relName,
      });

      const result = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (a)
           WHERE a.id = $assetID OR a.memberID = $assetID OR a.accountID = $assetID
           MATCH (a)-[:${relName}]->(n)
           RETURN n`,
          { assetID, relName }
        );
      });

      return result.records.map((record: any) => record.get("n").properties);
    } catch (error) {
      logError(
        "Error getting asset relationships",
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "RelationshipService",
          method: "getAssetRelationships",
          assetID,
          relName,
          error: error instanceof Error ? error.message : String(error),
        }
      );
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
      logInfo(`Checking if relationship exists`, {
        service: "RelationshipService",
        method: "relationshipExists",
        assetID,
        connectedID,
        relName,
      });

      const result = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (a)
           WHERE a.id = $assetID OR a.memberID = $assetID OR a.accountID = $assetID
           MATCH (n)
           WHERE n.id = $connectedID OR n.memberID = $connectedID OR n.accountID = $connectedID
           OPTIONAL MATCH (a)-[r:${relName}]->(n)
           RETURN count(r) AS relCount`,
          { assetID, connectedID, relName }
        );
      });

      return result.records[0].get("relCount").toNumber() > 0;
    } catch (error) {
      logError(
        "Error checking relationship existence",
        error instanceof Error ? error : new Error(String(error)),
        {
          service: "RelationshipService",
          method: "relationshipExists",
          assetID,
          connectedID,
          relName,
          error: error instanceof Error ? error.message : String(error),
        }
      );
      throw error;
    }
  }
}

// Export a singleton instance
export const relationshipService = new RelationshipService();
