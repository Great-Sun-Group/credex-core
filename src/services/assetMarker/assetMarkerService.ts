import { v4 as uuidv4 } from "uuid";
import { logInfo, logError } from "../../utils/logger";

/**
 * Interface for asset marker properties
 */
export interface AssetMarkerProps {
  assetName: string;
  description?: string;
  s3Key?: string;
  filename?: string;
  denomination?: string;
  generalLedgerAmount?: number;
  cxxMultiplier?: number;
  assetMarkerData?: Record<string, any>;
}

/**
 * Interface for account amount pairs
 */
export interface AccountAmount {
  accountID: string;
  amount: number;
}

/**
 * Service for managing asset markers
 */
export class AssetMarkerService {
  /**
   * Create a single asset marker with CR and DR relationships
   * @param session - Neo4j session
   * @param assetProps - Asset marker properties
   * @param crAccount - Credit account
   * @param drAccount - Debit account
   * @param glid - Optional GLid to group related assets
   * @returns The ID of the created asset marker
   */
  public async createSingleAssetMarker(
    session: any,
    assetProps: AssetMarkerProps,
    crAccount: AccountAmount,
    drAccount: AccountAmount,
    glid?: string
  ): Promise<string> {
    try {
      const assetID = uuidv4();
      const finalGlid = glid || uuidv4(); // Generate a new GLid if not provided
      
      // Build the properties object dynamically
      const properties: Record<string, any> = {
        id: assetID,
        assetName: assetProps.assetName,
        description: assetProps.description || "",
        s3Key: assetProps.s3Key || "",
        filename: assetProps.filename || "",
        GLid: finalGlid,
        AssetMarkerData: assetProps.assetMarkerData ? JSON.stringify(assetProps.assetMarkerData) : "{}",
        createdAt: "datetime()"
      };
      
      // Add optional properties only if they're provided
      if (assetProps.generalLedgerAmount !== undefined) {
        properties.GeneralLedgerAmount = assetProps.generalLedgerAmount;
      }
      
      if (assetProps.cxxMultiplier !== undefined) {
        properties.CXXmultiplier = assetProps.cxxMultiplier;
      }
      
      if (assetProps.denomination !== undefined) {
        properties.Denomination = assetProps.denomination;
      }
      
      // Create the property string for the Cypher query
      const propertyStrings = Object.entries(properties).map(([key, value]) => {
        if (key === 'createdAt') {
          return `${key}: ${value}`;
        }
        // Use exact property name for parameter
        return `${key}: $${key}`;
      });
      
      // Create the asset marker node
      await session.executeWrite(async (tx: any) => {
        await tx.run(
          `CREATE (a:AssetMarker {
            ${propertyStrings.join(',\n            ')}
          })
          WITH a
          MATCH (cr) WHERE cr.id = $crAccountID AND (cr:Account OR cr:AccountInternal)
          MATCH (dr) WHERE dr.id = $drAccountID AND (dr:Account OR dr:AccountInternal)
          CREATE (cr)-[:CR {amount: $crAmount}]->(a)-[:DR {amount: $drAmount}]->(dr)
          RETURN a`,
          { 
            id: assetID, 
            assetName: assetProps.assetName, 
            description: assetProps.description || "", 
            s3Key: assetProps.s3Key || "", 
            filename: assetProps.filename || "",
            ...(assetProps.generalLedgerAmount !== undefined ? { GeneralLedgerAmount: assetProps.generalLedgerAmount } : {}),
            ...(assetProps.cxxMultiplier !== undefined ? { CXXmultiplier: assetProps.cxxMultiplier } : {}),
            ...(assetProps.denomination !== undefined ? { Denomination: assetProps.denomination } : {}),
            GLid: finalGlid,
            AssetMarkerData: assetProps.assetMarkerData ? JSON.stringify(assetProps.assetMarkerData) : "{}",
            crAccountID: crAccount.accountID,
            crAmount: crAccount.amount,
            drAccountID: drAccount.accountID,
            drAmount: drAccount.amount
          }
        );
      });
      
      logInfo(`Created asset marker: ${assetID}`, {
        service: "AssetMarkerService",
        method: "createSingleAssetMarker",
        assetID,
        glid: finalGlid
      });
      
      return assetID;
    } catch (error) {
      logError("Error creating asset marker", error instanceof Error ? error : new Error(String(error)), {
        service: "AssetMarkerService",
        method: "createSingleAssetMarker",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Create multiple asset markers with a shared GLid
   * @param session - Neo4j session
   * @param assetProps - Asset marker properties
   * @param crAccounts - Credit accounts
   * @param drAccounts - Debit accounts
   * @returns The IDs of the created asset markers and the shared GLid
   */
  public async createMultipleAssetMarkers(
    session: any,
    assetProps: AssetMarkerProps,
    crAccounts: AccountAmount[],
    drAccounts: AccountAmount[]
  ): Promise<{ assetIDs: string[], glid: string }> {
    try {
      // Validate that the sum of CR amounts equals the sum of DR amounts
      const totalCR = crAccounts.reduce((sum, account) => sum + account.amount, 0);
      const totalDR = drAccounts.reduce((sum, account) => sum + account.amount, 0);
      
      if (totalCR !== totalDR) {
        throw new Error(`CR total (${totalCR}) must equal DR total (${totalDR})`);
      }
      
      // Generate a shared GLid for all related AssetMarkers
      const glid = uuidv4();
      const assetIDs: string[] = [];
      
      // Build the properties object dynamically
      const getPropertyStrings = (amount: number) => {
        const properties: Record<string, any> = {
          id: "$id",
          assetName: "$assetName",
          description: "$description",
          s3Key: "$s3Key",
          filename: "$filename",
          GLid: "$GLid",
          AssetMarkerData: "$AssetMarkerData",
          createdAt: "datetime()"
        };
        
        // Add optional properties only if they're provided
        if (assetProps.generalLedgerAmount !== undefined) {
          properties.GeneralLedgerAmount = "$GeneralLedgerAmount";
        }
        
        if (assetProps.cxxMultiplier !== undefined) {
          properties.CXXmultiplier = "$CXXmultiplier";
        }
        
        if (assetProps.denomination !== undefined) {
          properties.Denomination = "$Denomination";
        }
        
        // Create the property string for the Cypher query
        return Object.entries(properties).map(([key, value]) => {
          return `${key}: ${value}`;
        }).join(',\n              ');
      };
      
      // Create separate AssetMarker nodes for each CR/DR pair
      await session.executeWrite(async (tx: any) => {
        // Ensure we have matching CR and DR accounts
        const maxPairs = Math.min(crAccounts.length, drAccounts.length);
        
        // Create a separate AssetMarker for each CR/DR pair
        for (let i = 0; i < maxPairs; i++) {
          const crAccount = crAccounts[i];
          const drAccount = drAccounts[i];
          const assetID = uuidv4();
          assetIDs.push(assetID);
          
          // Create the asset marker node with GLid
          await tx.run(
            `CREATE (a:AssetMarker {
              ${getPropertyStrings(crAccount.amount)}
            })
            WITH a
            MATCH (cr) WHERE cr.id = $crAccountID AND (cr:Account OR cr:AccountInternal)
            MATCH (dr) WHERE dr.id = $drAccountID AND (dr:Account OR dr:AccountInternal)
            CREATE (cr)-[:CR]->(a)-[:DR]->(dr)
            RETURN a`,
            { 
              id: assetID, 
              assetName: assetProps.assetName, 
              description: assetProps.description || "", 
              s3Key: assetProps.s3Key || "", 
              filename: assetProps.filename || "",
              GeneralLedgerAmount: crAccount.amount,
              ...(assetProps.cxxMultiplier !== undefined ? { CXXmultiplier: assetProps.cxxMultiplier } : {}),
              ...(assetProps.denomination !== undefined ? { Denomination: assetProps.denomination } : {}),
              GLid: glid,
              AssetMarkerData: assetProps.assetMarkerData ? JSON.stringify(assetProps.assetMarkerData) : "{}",
              crAccountID: crAccount.accountID,
              crAmount: crAccount.amount,
              drAccountID: drAccount.accountID,
              drAmount: drAccount.amount
            }
          );
        }
        
        // If there are remaining CR accounts without matching DR accounts
        for (let i = maxPairs; i < crAccounts.length; i++) {
          const crAccount = crAccounts[i];
          const assetID = uuidv4();
          assetIDs.push(assetID);
          
          // Find a DR account to use (use the first one)
          const drAccount = drAccounts[0];
          
          // Create the asset marker node
          await tx.run(
            `CREATE (a:AssetMarker {
              ${getPropertyStrings(crAccount.amount)}
            })
            WITH a
            MATCH (cr) WHERE cr.id = $crAccountID AND (cr:Account OR cr:AccountInternal)
            MATCH (dr) WHERE dr.id = $drAccountID AND (dr:Account OR dr:AccountInternal)
            CREATE (cr)-[:CR]->(a)-[:DR]->(dr)
            RETURN a`,
            { 
              id: assetID, 
              assetName: assetProps.assetName, 
              description: assetProps.description || "", 
              s3Key: assetProps.s3Key || "", 
              filename: assetProps.filename || "",
              GeneralLedgerAmount: crAccount.amount,
              ...(assetProps.cxxMultiplier !== undefined ? { CXXmultiplier: assetProps.cxxMultiplier } : {}),
              ...(assetProps.denomination !== undefined ? { Denomination: assetProps.denomination } : {}),
              GLid: glid,
              AssetMarkerData: assetProps.assetMarkerData ? JSON.stringify(assetProps.assetMarkerData) : "{}",
              crAccountID: crAccount.accountID,
              crAmount: crAccount.amount,
              drAccountID: drAccount.accountID,
              drAmount: drAccount.amount
            }
          );
        }
        
        // If there are remaining DR accounts without matching CR accounts
        for (let i = maxPairs; i < drAccounts.length; i++) {
          const drAccount = drAccounts[i];
          const assetID = uuidv4();
          assetIDs.push(assetID);
          
          // Find a CR account to use (use the first one)
          const crAccount = crAccounts[0];
          
          // Create the asset marker node
          await tx.run(
            `CREATE (a:AssetMarker {
              ${getPropertyStrings(drAccount.amount)}
            })
            WITH a
            MATCH (cr) WHERE cr.id = $crAccountID AND (cr:Account OR cr:AccountInternal)
            MATCH (dr) WHERE dr.id = $drAccountID AND (dr:Account OR dr:AccountInternal)
            CREATE (cr)-[:CR {amount: $crAmount}]->(a)-[:DR {amount: $drAmount}]->(dr)
            RETURN a`,
            { 
              id: assetID, 
              assetName: assetProps.assetName, 
              description: assetProps.description || "", 
              s3Key: assetProps.s3Key || "", 
              filename: assetProps.filename || "",
              GeneralLedgerAmount: drAccount.amount,
              ...(assetProps.cxxMultiplier !== undefined ? { CXXmultiplier: assetProps.cxxMultiplier } : {}),
              ...(assetProps.denomination !== undefined ? { Denomination: assetProps.denomination } : {}),
              GLid: glid,
              AssetMarkerData: assetProps.assetMarkerData ? JSON.stringify(assetProps.assetMarkerData) : "{}",
              crAccountID: crAccount.accountID,
              crAmount: crAccount.amount,
              drAccountID: drAccount.accountID,
              drAmount: drAccount.amount
            }
          );
        }
      });
      
      logInfo(`Created ${assetIDs.length} asset markers with GLid: ${glid}`, {
        service: "AssetMarkerService",
        method: "createMultipleAssetMarkers",
        assetIDs,
        glid
      });
      
      return { assetIDs, glid };
    } catch (error) {
      logError("Error creating multiple asset markers", error instanceof Error ? error : new Error(String(error)), {
        service: "AssetMarkerService",
        method: "createMultipleAssetMarkers",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Create a related set of asset markers with a shared source
   * @param session - Neo4j session
   * @param memberID - Member ID
   * @param sourceAssetProps - Properties for the source asset
   * @param derivedAssets - Array of properties for derived assets
   * @param crAccountID - Credit account ID
   * @param drAccountID - Debit account ID
   * @param glid - Optional GLid to group related assets
   * @returns The IDs of the created asset markers
   */
  public async createRelatedAssetMarkers(
    session: any,
    memberID: string,
    sourceAssetProps: AssetMarkerProps,
    derivedAssets: AssetMarkerProps[],
    crAccountID: string,
    drAccountID: string,
    glid?: string
  ): Promise<{ sourceAssetID: string, derivedAssetIDs: string[], glid: string }> {
    try {
      // Create asset marker IDs and GLid
      const sourceAssetID = uuidv4();
      const derivedAssetIDs: string[] = derivedAssets.map(() => uuidv4());
      const finalGlid = glid || uuidv4(); // Generate a new GLid if not provided
      
      // Create the asset markers
      await session.executeWrite(async (tx: any) => {
        // Create the source asset marker node with direct OWNS relationship from member
        await tx.run(
          `CREATE (a:AssetMarker {
            id: $assetID,
            assetName: $assetName,
            description: $description,
            s3Key: $s3Key,
            filename: $filename,
            GLid: $glid,
            ${sourceAssetProps.generalLedgerAmount !== undefined ? 'GeneralLedgerAmount: $generalLedgerAmount,' : ''}
            ${sourceAssetProps.cxxMultiplier !== undefined ? 'CXXmultiplier: $cxxMultiplier,' : ''}
            ${sourceAssetProps.denomination !== undefined ? 'Denomination: $denomination,' : ''}
            AssetMarkerData: $assetMarkerData,
            createdAt: datetime()
          })
          WITH a
          MATCH (cr) WHERE cr.id = $crAccountID AND (cr:Account OR cr:AccountInternal)
          MATCH (dr) WHERE dr.id = $drAccountID AND (dr:Account OR dr:AccountInternal)
          MATCH (m:Member {memberID: $memberID})
          CREATE (cr)-[:CR {amount: 1}]->(a)-[:DR {amount: 1}]->(dr)
          CREATE (m)-[:OWNS]->(a)
          RETURN a`,
          { 
            id: sourceAssetID, 
            assetName: sourceAssetProps.assetName,
            description: sourceAssetProps.description || "",
            s3Key: sourceAssetProps.s3Key || "",
            filename: sourceAssetProps.filename || "",
            GLid: finalGlid,
            ...(sourceAssetProps.generalLedgerAmount !== undefined ? { GeneralLedgerAmount: sourceAssetProps.generalLedgerAmount } : {}),
            ...(sourceAssetProps.cxxMultiplier !== undefined ? { CXXmultiplier: sourceAssetProps.cxxMultiplier } : {}),
            ...(sourceAssetProps.denomination !== undefined ? { Denomination: sourceAssetProps.denomination } : {}),
            AssetMarkerData: sourceAssetProps.assetMarkerData ? JSON.stringify(sourceAssetProps.assetMarkerData) : "{}",
            crAccountID,
            drAccountID,
            memberID
          }
        );

        // Create the derived asset markers
        for (let i = 0; i < derivedAssets.length; i++) {
          const derivedAsset = derivedAssets[i];
          const derivedAssetID = derivedAssetIDs[i];
          
          await tx.run(
            `CREATE (a:AssetMarker {
              id: $assetID,
              assetName: $assetName,
              description: $description,
              s3Key: $s3Key,
              filename: $filename,
              GLid: $glid,
              ${derivedAsset.generalLedgerAmount !== undefined ? 'GeneralLedgerAmount: $generalLedgerAmount,' : ''}
              ${derivedAsset.cxxMultiplier !== undefined ? 'CXXmultiplier: $cxxMultiplier,' : ''}
              ${derivedAsset.denomination !== undefined ? 'Denomination: $denomination,' : ''}
              AssetMarkerData: $assetMarkerData,
              createdAt: datetime()
            })
            WITH a
            MATCH (cr) WHERE cr.id = $crAccountID AND (cr:Account OR cr:AccountInternal)
            MATCH (dr) WHERE dr.id = $drAccountID AND (dr:Account OR dr:AccountInternal)
            MATCH (source:AssetMarker {id: $sourceAssetID})
            MATCH (m:Member {memberID: $memberID})
            CREATE (cr)-[:CR {amount: 1}]->(a)-[:DR {amount: 1}]->(dr)
            CREATE (source)-[:USED_IN]->(a)
            CREATE (m)-[:OWNS]->(a)
            RETURN a`,
            { 
              id: derivedAssetID, 
              assetName: derivedAsset.assetName,
              description: derivedAsset.description || "",
              s3Key: derivedAsset.s3Key || "",
              filename: derivedAsset.filename || "",
              GLid: finalGlid,
              ...(derivedAsset.generalLedgerAmount !== undefined ? { GeneralLedgerAmount: derivedAsset.generalLedgerAmount } : {}),
              ...(derivedAsset.cxxMultiplier !== undefined ? { CXXmultiplier: derivedAsset.cxxMultiplier } : {}),
              ...(derivedAsset.denomination !== undefined ? { Denomination: derivedAsset.denomination } : {}),
              AssetMarkerData: derivedAsset.assetMarkerData ? JSON.stringify(derivedAsset.assetMarkerData) : "{}",
              crAccountID,
              drAccountID,
              sourceAssetID,
              memberID
            }
          );
        }
      });
      
      logInfo(`Created related asset markers for ${sourceAssetProps.assetName}`, {
        service: "AssetMarkerService",
        method: "createRelatedAssetMarkers",
        sourceAssetID,
        derivedAssetIDs
      });
      
      return { sourceAssetID, derivedAssetIDs, glid: finalGlid };
    } catch (error) {
      logError("Error creating image assets", error instanceof Error ? error : new Error(String(error)), {
        service: "AssetMarkerService",
        method: "createImageAssets",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Get an asset marker by ID
   * @param session - Neo4j session
   * @param assetID - Asset marker ID
   * @returns The asset marker properties
   */
  public async getAssetMarker(session: any, assetID: string): Promise<any> {
    try {
      const result = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})
           RETURN a`,
          { assetID }
        );
      });
      
      if (result.records.length === 0) {
        throw new Error(`Asset marker not found: ${assetID}`);
      }
      
      return result.records[0].get("a").properties;
    } catch (error) {
      logError("Error getting asset marker", error instanceof Error ? error : new Error(String(error)), {
        service: "AssetMarkerService",
        method: "getAssetMarker",
        assetID,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Update an asset marker
   * @param session - Neo4j session
   * @param assetID - Asset marker ID
   * @param updates - Properties to update
   * @returns The updated asset marker properties
   */
  public async updateAssetMarker(
    session: any,
    assetID: string,
    updates: Partial<AssetMarkerProps>
  ): Promise<any> {
    try {
      // Build the update query dynamically based on provided fields
      let setClause = [];
      const params: Record<string, any> = { assetID };
      
      if (updates.assetName) {
        setClause.push("a.assetName = $assetName");
        params.assetName = updates.assetName;
      }
      
      if (updates.description !== undefined) {
        setClause.push("a.description = $description");
        params.description = updates.description || "";
      }
      
      if (updates.s3Key !== undefined) {
        setClause.push("a.s3Key = $s3Key");
        params.s3Key = updates.s3Key || "";
      }
      
      if (updates.filename !== undefined) {
        setClause.push("a.filename = $filename");
        params.filename = updates.filename || "";
      }
      
      if (updates.denomination !== undefined) {
        setClause.push("a.Denomination = $denomination");
        params.denomination = updates.denomination;
      }
      
      if (updates.generalLedgerAmount !== undefined) {
        setClause.push("a.GeneralLedgerAmount = $generalLedgerAmount");
        params.generalLedgerAmount = updates.generalLedgerAmount;
      }
      
      if (updates.cxxMultiplier !== undefined) {
        setClause.push("a.CXXmultiplier = $cxxMultiplier");
        params.cxxMultiplier = updates.cxxMultiplier;
      }
      
      if (updates.assetMarkerData !== undefined) {
        setClause.push("a.AssetMarkerData = $assetMarkerData");
        params.assetMarkerData = JSON.stringify(updates.assetMarkerData);
      }
      
      if (setClause.length === 0) {
        throw new Error("No updates provided");
      }
      
      // Execute the update query
      const result = await session.executeWrite(async (tx: any) => {
        return await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})
           SET ${setClause.join(", ")}
           RETURN a`,
          params
        );
      });
      
      if (result.records.length === 0) {
        throw new Error(`Asset marker not found: ${assetID}`);
      }
      
      logInfo(`Updated asset marker: ${assetID}`, {
        service: "AssetMarkerService",
        method: "updateAssetMarker",
        assetID,
        updates: Object.keys(updates)
      });
      
      return result.records[0].get("a").properties;
    } catch (error) {
      logError("Error updating asset marker", error instanceof Error ? error : new Error(String(error)), {
        service: "AssetMarkerService",
        method: "updateAssetMarker",
        assetID,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Delete an asset marker
   * @param session - Neo4j session
   * @param assetID - Asset marker ID
   * @returns True if the asset marker was deleted
   */
  public async deleteAssetMarker(session: any, assetID: string): Promise<boolean> {
    try {
      // Check if the asset marker exists
      const checkResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})
           RETURN a`,
          { assetID }
        );
      });
      
      if (checkResult.records.length === 0) {
        throw new Error(`Asset marker not found: ${assetID}`);
      }
      
      // Delete all relationships first
      await session.executeWrite(async (tx: any) => {
        await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})-[r]-()
           DELETE r`,
          { assetID }
        );
      });
      
      // Delete the asset marker
      const result = await session.executeWrite(async (tx: any) => {
        return await tx.run(
          `MATCH (a:AssetMarker {id: $assetID})
           DELETE a
           RETURN count(a) AS deletedCount`,
          { assetID }
        );
      });
      
      const deletedCount = result.records[0].get("deletedCount").toNumber();
      
      logInfo(`Deleted asset marker: ${assetID}`, {
        service: "AssetMarkerService",
        method: "deleteAssetMarker",
        assetID,
        deletedCount
      });
      
      return deletedCount > 0;
    } catch (error) {
      logError("Error deleting asset marker", error instanceof Error ? error : new Error(String(error)), {
        service: "AssetMarkerService",
        method: "deleteAssetMarker",
        assetID,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Find or create the "Onboarded Assets" account for a member
   * @param session - Neo4j session
   * @param memberID - Member ID
   * @returns The account ID
   */
  public async findOrCreateOnboardedAssetsAccount(session: any, memberID: string): Promise<string> {
    try {
      const onboardedAssetsResult = await session.executeRead(async (tx: any) => {
        return await tx.run(
          `MATCH (m:Member {memberID: $memberID})-[:OWNS]->(a:AccountInternal {accountName: "Onboarded Assets"})
           RETURN a.id AS accountID`,
          { memberID }
        );
      });

      if (onboardedAssetsResult.records.length > 0) {
        return onboardedAssetsResult.records[0].get("accountID");
      } else {
        // Create the "Onboarded Assets" account
        const createAccountResult = await session.executeWrite(async (tx: any) => {
          return await tx.run(
            `MATCH (m:Member {memberID: $memberID})
             CREATE (a:AccountInternal {
               id: apoc.create.uuid(),
               accountName: "Onboarded Assets",
               accountType: "PRODUCTION",
               createdAt: datetime()
             })
             CREATE (m)-[:OWNS]->(a)
             RETURN a.id AS accountID`,
            { memberID }
          );
        });

        if (createAccountResult.records.length > 0) {
          return createAccountResult.records[0].get("accountID");
        } else {
          throw new Error("Failed to create Onboarded Assets account");
        }
      }
    } catch (error) {
      logError("Error finding or creating Onboarded Assets account", error instanceof Error ? error : new Error(String(error)), {
        service: "AssetMarkerService",
        method: "findOrCreateOnboardedAssetsAccount",
        memberID,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Export a singleton instance
export const assetMarkerService = new AssetMarkerService();
