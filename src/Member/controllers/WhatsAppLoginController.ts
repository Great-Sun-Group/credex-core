import express from "express";
import { GetMemberAndDashboardsService } from "../services/GetMemberAndDashboardsService";

export async function WhatsAppLoginController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const loginData = await GetMemberAndDashboardsService(req.body.phone);
    if (loginData) {
      res.status(200).json({
        loginData,
      });
    } else {
      res.status(404).json({ message: "Member not found" });
    }
  } catch (err) {
    console.error("Error retrieving member:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
