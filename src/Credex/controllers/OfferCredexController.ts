// Controller for getting a s simgel member record 
import express from "express";
import { OfferCredexService } from "../services/OfferCredexService";


export async function OfferCredexController(
  req: express.Request, 
  res: express.Response
) {
    const fieldsRequired = [
        "issuerMemberID",
        "receiverMemberID",
        "Denomination",
        "InitialAmount",
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
    const responseData = await OfferCredexService(req.body);    
     res.json(responseData); 
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}