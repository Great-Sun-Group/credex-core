import express from "express";
import { GetIncomingOffersService } from "../services/GetIncomingOffersService";


export async function GetIncomingOffersController(
  req: express.Request, 
  res: express.Response
) {
  const memberID = req.body.memberID;
  try {   
    const responseData = await GetIncomingOffersService(memberID);    
     res.json(responseData); 
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}