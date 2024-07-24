import express from "express";
import { UnauthorizeForCompanyService } from "../services/UnauthorizeForAccount";

export async function UnauthorizeForAccountController(
  req: express.Request,
  res: express.Response
) {
  const requiredFields = ["memberIDtoBeUnauthorized", "accountID", "ownerID"];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ message: `${field} is required` });
    }
  }

  try {
    const responseData = await UnauthorizeForCompanyService(
      req.body.memberIDtoBeUnauthorized,
      req.body.accountID,
      req.body.ownerID
    );

    if (!responseData) {
      return res
        .status(400)
        .json({ message: "Failed to unauthorize account for the company" });
    }

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Error unauthorizing account for company:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
