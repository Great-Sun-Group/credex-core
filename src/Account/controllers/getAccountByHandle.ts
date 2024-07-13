import express from "express";
import { GetAccountByHandleService } from "../services/GetAccountByHandle";

export async function GetAccountByHandleController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const accountData = await GetAccountByHandleService(req.body.handle);

    if (accountData) {
      res.status(200).json({ accountData });
    } else {
      res.status(404).json({ message: "Account not found" });
    }
  } catch (err) {
    console.error("Error retrieving account:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
