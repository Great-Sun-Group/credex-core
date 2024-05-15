import express from "express";
import { DailyCredcoinOffering } from "../../Core/services/DailyCredcoinOffering";


export async function ForceDcoController(
  res: express.Response
) {
  try {   
    const responseData = await DailyCredcoinOffering();    
     res.json(responseData); 
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}