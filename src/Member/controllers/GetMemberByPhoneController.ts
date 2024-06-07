import express from "express";
import { GetMemberByPhoneService } from "../services/GetMemberByPhoneService";
import { GetBalancesService } from "../../Credex/services/GetBalancesService";
import { GetPendingOffersInService } from "../../Credex/services/GetPendingOffersInService";
import { GetPendingOffersOutService } from "../../Credex/services/GetPendingOffersOutService";

export async function GetMemberByPhoneController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const memberData = await GetMemberByPhoneService(req.body.phone);
    let balanceData;
    let pendingInData;
    let pendingOutData;
    if (memberData) {
      balanceData = await GetBalancesService(memberData.memberID);
      pendingInData = await GetPendingOffersInService(memberData.memberID);
      pendingOutData = await GetPendingOffersOutService(memberData.memberID);
    }

    if (balanceData) {
      res
        .status(200)
        .json({
          memberData,
          balanceData,
          pendingInData,
          pendingOutData
        });
    } else {
      res.status(404).json({ message: "Member not found" });
    }
  } catch (err) {
    console.error("Error retrieving member:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
