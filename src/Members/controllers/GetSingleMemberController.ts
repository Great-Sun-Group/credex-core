// Controller for getting a s simgel member record 
import express from "express";
import { GetSingleMemberService } from "../services/GetMemberService";


export async function GetSingleMemberController(
  req: express.Request, 
  res: express.Response
) {
  const memberId = req.params.id;
  try {   
    const responseData = await GetSingleMemberService(memberId);    
     res.json(responseData); 
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}