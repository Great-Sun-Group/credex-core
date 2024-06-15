import express from "express";
import { GetHumanMemberByPhoneService } from "../services/GetHumanMemberByPhoneService";
import { GetMemberService } from "../services/GetMemberService";

export async function WhatsAppHumanLoginController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const humanMemberData = await GetHumanMemberByPhoneService(req.body.phone);
    if (humanMemberData) {
      const defaultAccountData = await GetMemberService(humanMemberData.defaultAccountID);
      res.status(200).json({
        humanMemberData,
        defaultAccountData,
      });
    } else {
      res.status(404).json({ message: "Member not found" });
    }
  } catch (err) {
    console.error("Error retrieving member:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
