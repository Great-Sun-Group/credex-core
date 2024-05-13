// Controller for getting a s simgel member record 
import express from "express";
import { session } from "../../config/neo4j/neo4j"

export async function GetSingleMemberController(
  req: express.Request, 
  res: express.Response
) {
  const memberId = req.params.id;
  try {
    const result = await session.run(`
    MATCH (daynode:DayNode{Active:true})
    OPTIONAL MATCH (member:Member{memberID:$memberId})-[transactionType:OWES|CLEARED|OFFERS|REQUESTS]-(credex:Credex)-[:OWES|CLEARED|OFFERS|REQUESTS]-(counterparty:Member)
    OPTIONAL MATCH (credex)<-[:SECURES]-(securer:Member)
    RETURN member, credex, counterparty, securer
    `, { memberId: memberId});
    
    const responseData = result.records.map(record => {
      const member = record.get('member');
      const credex = record.get('credex');
      const counterparty = record.get('counterparty');
      const securer = record.get('securer');

      return {
        member: member ? member.properties : null,
        credex: credex ? credex.properties : null,
        counterparty: counterparty ? counterparty.properties : null,
        securer: securer ? securer.properties : null
      };
    });

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}