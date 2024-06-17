import express from "express";
import { UnauthorizeForCompanyService } from "../services/UnauthorizeForCompanyService";

export async function UnauthorizeForCompanyController(
  req: express.Request,
  res: express.Response
) {
  const requiredFields = ["MemberIDtoBeUnauthorized", "companyID", "ownerID"];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ message: `${field} is required` });
    }
  }

  try {
    const responseData = await UnauthorizeForCompanyService(
      req.body.MemberIDtoBeUnauthorized,
      req.body.companyID,
      req.body.ownerID
    );

    if (!responseData) {
      return res
        .status(400)
        .json({ message: "Failed to unauthorize member for the company" });
    }

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Error unauthorizing member for company:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
