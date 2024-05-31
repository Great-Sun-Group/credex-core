import express from "express";
import { UpdateMemberService } from "../services/UpdateMemberService";

export async function UpdateMemberController(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const { memberID } = req.body;

  if (!memberID) {
    res.status(400).json({ message: "memberID is required" });
    return;
  }

  try {
    const updatedMemberID = await UpdateMemberService(req.body);

    if (updatedMemberID) {
      res
        .status(200)
        .json({ message: `Member updated successfully: ${updatedMemberID}` });
    } else {
      res
        .status(404)
        .json({ message: "Member not found or no update performed" });
    }
  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({ error: "Failed to update member" });
  }
}
