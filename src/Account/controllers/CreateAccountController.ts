import express from "express";
import { CreateAccountService } from "../services/CreateAccountService";

export async function CreateAccountController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const fieldsRequired = ["accountType", "defaultDenom", "handle", "phone"];

  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      res.status(400).json({ message: `${field} is required` });
      return;
    }
  }

  try {
    const newAccount = await CreateAccountService(req.body);

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
