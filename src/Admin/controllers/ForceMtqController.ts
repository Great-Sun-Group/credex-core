import express from "express";
import { MinuteTransactionQueue } from "../../Core/services/MinuteTransactionQueue";


export async function ForceMtqController(
  res: express.Response
) {
  try {   
    const responseData = await MinuteTransactionQueue();    
     res.json(responseData); 
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}