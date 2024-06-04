import express from "express";
import { GetMemberService } from "../services/GetMemberService";

export async function GetMemberController(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const { memberID } = req.body;

  if (!memberID) {
    res.status(400).json({ message: "memberID is required" });
    return;
  }

  try {
    const responseData = await GetMemberService(memberID);

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
