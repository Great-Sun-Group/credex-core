import express from "express";
import { GetPendingOffersInService } from "../services/GetPendingOffersInService";


export async function GetPendingOffersInController(
  req: express.Request, 
  res: express.Response
) {
  const memberID = req.body.memberID;
  try {   
    const responseData = await GetPendingOffersInService(memberID);    
     res.json(responseData); 
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}