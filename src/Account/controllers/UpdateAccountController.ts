import express from "express";
import { UpdateAccountService } from "../services/UpdateAccountService";

export async function UpdateAccountController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const { accountID } = req.body;

  if (!accountID) {
    res.status(400).json({ message: "accountID is required" });
    return;
  }

  try {
    const updatedAccountID = await UpdateAccountService(
      req.body.ownerID,
      req.body.accountID,
      req.body.phone,
      req.body.handle,
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
