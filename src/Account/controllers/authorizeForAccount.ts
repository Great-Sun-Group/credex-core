import express from "express";
import { AuthorizeForAccountService } from "../services/AuthorizeForAccount";

export async function AuthorizeForAccountController(
  req: express.Request,
  res: express.Response
) {
  const requiredFields = ["memberHandleToBeAuthorized", "accountID", "ownerID"];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ message: `${field} is required` });
    }
  }

  try {
    const responseData = await AuthorizeForAccountService(
      req.body.memberHandleToBeAuthorized,
      req.body.accountID,
      req.body.ownerID
    );

    if (!responseData) {
      return res
        .status(400)
        .json({ message: "Failed to authorize account for the company" });
    }

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Error authorizing account for company:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
