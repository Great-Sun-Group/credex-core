import express from "express";
import { CreateAccountService } from "../services/CreateAccount";

export async function CreateAccountController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const fieldsRequired = [
    "ownerID",
    "accountType",
    "accountName",
    "accountHandle",
    "defaultDenom",
  ];

  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      res.status(400).json({ message: `${field} is required` });
      return;
    }
  }

  try {
    const newAccount = await CreateAccountService(
      req.body.ownerID,
      req.body.accountType,
      req.body.accountName,
      req.body.accountHandle,
      req.body.defaultDenom
    );

    if (newAccount.account) {
      res.status(200).json(newAccount.account);
    } else {
      res.status(400).json({ message: newAccount.message });
    }
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
