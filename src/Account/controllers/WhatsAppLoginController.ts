import express from "express";
import { GetAccountAndDashboardsService } from "../services/GetAccountAndDashboardsService";

export async function WhatsAppLoginController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const loginData = await GetAccountAndDashboardsService(req.body.phone);
    if (loginData) {
      res.status(200).json({
        loginData,
      });
    } else {
      res.status(404).json({ message: "Account not found" });
    }
  } catch (err) {
    console.error("Error retrieving account:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
