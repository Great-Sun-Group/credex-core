import express from "express";
import { AuthorizeForCompanyService } from "../services/AuthorizeForCompanyService";

export async function AuthorizeForCompanyController(
  req: express.Request,
  res: express.Response,
) {
  const requiredFields = ["MemberIDtoBeAuthorized", "companyID", "ownerID"];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ message: `${field} is required` });
    }
  }

  try {
    const responseData = await AuthorizeForCompanyService(
      req.body.MemberIDtoBeAuthorized,
      req.body.companyID,
      req.body.ownerID,
    );

    if (!responseData) {
      return res
        .status(400)
        .json({ message: "Failed to authorize member for the company" });
    }

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Error authorizing member for company:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
