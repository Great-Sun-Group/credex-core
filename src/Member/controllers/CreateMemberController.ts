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

    if (newMember.member) {
      res.status(200).json(newMember.member);
    } else {
      res.status(400).json({ message: newMember.message });
    }
  } catch (error) {
    console.error("Error creating member:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
