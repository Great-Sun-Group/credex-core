// Controller for getting a s simgel member record 
import express from "express";

export async function GetSingleMemberController(
  req: express.Request, 
  res: express.Response
) {
  try {
    // const result = await neo4j.execute('MATCH (n:Member {id: $id}) RETURN n', { id: req.params.id });
    // res.json(result.records.map(record => record.get('n').properties));
    res.send('lalalalalalalala')
  } catch (err) {
    // res.status(500).json({ error: err.message });
  }
}