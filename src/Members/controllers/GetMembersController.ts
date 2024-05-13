import express from "express";
import { session } from "../../config/neo4j/neo4j";

export async function GetMembersController(
  req: express.Request, 
  res: express.Response
) {
  try {
    const result = await session.run(`MATCH (n:Member) RETURN n LIMIT 25`);   
    session.close() 
    res.json(result.records.map(record => record.get('n').properties));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}