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

  const { memberHandleToBeAuthorized, accountID, ownerID } = req.body;

  // Validate memberHandleToBeAuthorized
  if (typeof memberHandleToBeAuthorized !== 'string' || memberHandleToBeAuthorized.trim() === '') {
    return res.status(400).json({ message: "Invalid memberHandleToBeAuthorized" });
  }

  // Validate accountID
  if (typeof accountID !== 'string' || accountID.trim() === '') {
    return res.status(400).json({ message: "Invalid accountID" });
  }

  // Validate ownerID
  if (typeof ownerID !== 'string' || ownerID.trim() === '') {
    return res.status(400).json({ message: "Invalid ownerID" });
  }

  try {
    const responseData = await AuthorizeForAccountService(
      memberHandleToBeAuthorized,
      accountID,
      ownerID
    );

    if (!responseData) {
      return res
        .status(400)
        .json({ message: "Failed to authorize member for account" });
    }

    if (responseData.message === "accounts not found") {
      return res.status(404).json({ message: "Accounts not found" });
    }

    if (responseData.message === "Limit of 5 authorized accounts reached. Remove an authorized account if you want to add another.") {
      return res.status(400).json({ message: responseData.message });
    }

    if (responseData.message === "You can only authorize someone to transact on behalf of your account when you are on the Entrepreneur tier or above.") {
      return res.status(403).json({ message: responseData.message });
    }

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Error authorizing member for account:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
