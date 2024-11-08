import crypto from "crypto";

/**
 * Calculates a system-wide checksum based on nodes and relationships in Neo4j
 */
export async function calculateSystemChecksum(session: any): Promise<string> {
  const nodesResult = await session.run(`
    MATCH (n)
    WITH collect(properties(n)) AS allNodes
    WITH apoc.convert.toJson(allNodes) AS nodesJson
    RETURN apoc.util.md5([nodesJson]) AS nodesChecksum
  `);
  const nodesChecksum = nodesResult.records[0].get("nodesChecksum");

  const relationshipsResult = await session.run(`
    MATCH ()-[r]->()
    WITH collect(properties(r)) AS allRelationships
    WITH apoc.convert.toJson(allRelationships) AS relationshipsJson
    RETURN apoc.util.md5([relationshipsJson]) AS relationshipsChecksum
  `);
  const relationshipsChecksum = relationshipsResult.records[0].get(
    "relationshipsChecksum"
  );

  const combinedChecksum = crypto
    .createHash("md5")
    .update(nodesChecksum + relationshipsChecksum)
    .digest("hex");
  return combinedChecksum;
}
