import express from "express";
import { CreateMemberService } from "../services/CreateMemberService";

export async function CreateMemberController(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const fieldsRequired = ["memberType", "defaultDenom", "handle", "phone"];

  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      res.status(400).json({ message: `${field} is required` });
      return;
    }
  }

  try {
    const newMember = await CreateMemberService(req.body);

    if (newMember) {
      res.status(200).json(newMember);
    } else {
      res.status(400).json({ message: "Failed to create member" });
    }
  } catch (error) {
    console.error("Error creating member:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
