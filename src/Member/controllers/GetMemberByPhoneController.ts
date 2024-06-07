import express from "express";
import { GetMemberByPhoneService } from "../services/GetMemberByPhoneService";
import { GetBalancesService } from "../../Credex/services/GetBalancesService";

export async function GetMemberByPhoneController(
  req: express.Request,
  res: express.Response
): Promise<void> {

  try {
    const memberData = await GetMemberByPhoneService(req.body.phone);
    let balanceData
    if (memberData) {
      balanceData = await GetBalancesService(memberData.memberID);
    }

    if (balanceData) {
      res.status(200).json({memberData, balanceData});
    } else {
      res.status(404).json({ message: "Member not found" });
    }
  } catch (err) {
    console.error("Error retrieving member:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
