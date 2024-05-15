import express from "express";
import { ClearDevDbService } from "../services/ClearDevDbService";


export async function ClearDevDbController(
  res: express.Response
) {
  try {   
    const responseData = await ClearDevDbService();    
     res.json(responseData); 
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}