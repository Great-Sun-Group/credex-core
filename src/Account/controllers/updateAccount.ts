import express from "express";
import { UpdateAccountService } from "../services/UpdateAccount";

export async function UpdateAccountController(
  req: express.Request,
  res: express.Response
) {
  const requiredFields = ["ownerID", "accountID"];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ message: `${field} is required` });
    }
  }

  try {
    const updatedAccountID = await UpdateAccountService(
      req.body.ownerID,
      req.body.accountID,
      req.body.accountName,
      req.body.accountHandle,
      req.body.defaultDenom
    );

    if (updatedAccountID) {
      res
        .status(200)
        .json({ message: `Account updated successfully: ${updatedAccountID}` });
    } else {
      res
        .status(404)
        .json({ message: "Account not found or no update performed" });
    }
  } catch (error) {
    console.error("Error updating account:", error);
    res.status(500).json({ error: "Failed to update account" });
  }
}
