import express from "express";
import { UpdateMemberService } from "../services/UpdateMemberService";

export default function UpdateMemberController(
  req: express.Request,
  res: express.Response
) {
  try {
    UpdateMemberService(req.body);
    return res.json({ message: "Member updated successfully" }).status(200);
  } catch (error) {
    return res.status(400).json({ message: error });
  }
}
