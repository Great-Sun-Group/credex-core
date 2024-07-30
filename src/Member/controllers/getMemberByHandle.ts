import express from "express";
import { GetMemberByHandleService } from "../services/GetMemberByHandle";

export async function GetMemberByHandleController(
  req: express.Request,
  res: express.Response
) {
  const requiredFields = ["memberHandle"];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ message: `${field} is required` });
    }
  }

  try {
    const memberData = await GetMemberByHandleService(req.body.memberHandle);

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
