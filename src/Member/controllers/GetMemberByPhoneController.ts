import express from "express";
import { GetMemberByPhoneService } from "../services/GetMemberByPhoneService";

export async function GetMemberByPhoneController(
  req: express.Request,
  res: express.Response
): Promise<void> {

  try {
    const responseData = await GetMemberByPhoneService(req.body.phone);

    if (responseData) {
      res.status(200).json(responseData);
    } else {
      res.status(404).json({ message: "Member not found" });
    }
  } catch (err) {
    console.error("Error retrieving member:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
