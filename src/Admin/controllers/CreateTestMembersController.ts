import express from "express";
import { CreateTestMembersService } from "../services/CreateTestMembersService";

export async function CreateTestMembersController(
  req: express.Request, 
  res: express.Response
) {
    const fieldsRequired = [
        "numNewMembers",
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
    const responseData = await CreateTestMembersService(req.body.numNewMembers);    
     res.json(responseData); 
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}