import express from "express";
import { AuthorizeForCompanyService } from "../services/AuthorizeForCompanyService";

export async function AuthorizeForCompanyController(
  req: express.Request, 
  res: express.Response
) {
    const fieldsRequired = [
        "MemberIDtoBeAuthorized",
        "companyID",
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
    const responseData = await AuthorizeForCompanyService(req.body.MemberIDtoBeAuthorized, req.body.companyID);    
     res.json(responseData).status(200); 
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}