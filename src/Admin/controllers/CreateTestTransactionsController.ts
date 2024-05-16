import express from "express";
import { CreateTestTransactionsService } from "../services/CreateTestTransactionsService";

export async function CreateTestTransactionsController(
  req: express.Request, 
  res: express.Response
) {
    const fieldsRequired = [
        "numNewTransactions",
      ];
      for (const field of fieldsRequired) {
        if (!req.body[field]) {
          return res
            .status(400)
            .json({ message: `${field} is required` })
            .send();
        }
      }
  try {   
    const responseData = await CreateTestTransactionsService(req.body.numNewTransactions);    
     res.json(responseData); 
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}