import express from "express";
import { SetDefaultAccountService } from "../services/SetDefaultAccountService";

export async function SetDefaultAccountController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const fieldsRequired = ["memberID", "defaultAccountID"];

  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      res.status(400).json({ message: `${field} is required` });
      return;
    }
  }

  try {
    const setDefaultAccount = await SetDefaultAccountService(
      req.body.memberID,
      req.body.defaultAccountID
    );

    if (setDefaultAccount) {
      res.status(200).json({ message: "default account set"});
    } else {
      res.status(400).json({ message: "error setting default account" });
    }
  } catch (error) {
    console.error("Error setting default account: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
