import express from "express";
import { GetMemberByHandleService } from "../services/GetMemberByHandleService";

export async function GetMemberByHandleController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const memberData = await GetMemberByHandleService(req.body.handle);

    if (memberData) {
      res.status(200).json({ memberData });
    } else {
      res.status(404).json({ message: "Member not found" });
    }
  } catch (err) {
    console.error("Error retrieving member:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
