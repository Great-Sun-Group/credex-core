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
    MATCH (member:Member {memberID: $memberId})
    RETURN
      member.defaultDenom AS defaultDenom,
      member.memberSince AS memberSince,
      member.createdAt AS createdAt,
      member.firstname AS firstname,
      member.phone AS phone,
      member.queueStatus AS queueStatus,
      member.handle AS handle,
      member.memberType AS memberType,
      member.updatedAt AS updatedAt,
      member.memberID AS memberID,
      member.lastname AS lastname
    `, { memberId: memberId });
    
    const responseData = result.records.map(record => {
      return {
        defaultDenom: record.get('defaultDenom'),
        memberSince: record.get('memberSince'),
        createdAt: record.get('createdAt'),
        firstname: record.get('firstname'),
        phone: record.get('phone'),
        queueStatus: record.get('queueStatus'),
        handle: record.get('handle'),
        memberType: record.get('memberType'),
        updatedAt: record.get('updatedAt'),
        memberID: record.get('memberID'),
        lastname: record.get('lastname')
      };
    });

    res.json(responseData); 
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}