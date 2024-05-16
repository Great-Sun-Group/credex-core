import express from "express";
import { DeclineCredexService } from "../services/DeclineCredexService";

export async function DeclineCredexController(
  req: express.Request, 
  res: express.Response
) {
    const fieldsRequired = [
        "credexID",
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
    const responseData = await DeclineCredexService(req.body.credexID);    
     res.json(responseData); 
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}