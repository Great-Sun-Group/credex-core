import express from "express";
import { UpdateMemberTierService } from "../services/UpdateMemberTier";

export async function UpdateMemberTierController(
  req: express.Request,
  res: express.Response
) {
  const requiredFields = ["memberID", "newTier"];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ message: `${field} is required` });
    }
  }

  try {
    const memberData = await UpdateMemberTierService(
      req.body.memberID,
      req.body.newTier
    );

    if (memberData) {
      res.status(200).json( true );
    } else {
      res.status(404).json({ message: "Member not found" });
    }
  } catch (err) {
    console.error("Error retrieving member:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
