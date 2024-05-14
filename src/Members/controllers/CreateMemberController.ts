import express from "express";
import { CreateMemberService } from "../services/CreateMemberService";

export async function CreateMemberController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = [
    "memberType",
    "defaultDenom",
    "handle",
    "phone",
  ];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }
  let newMemberID = await CreateMemberService(req.body);
  if (newMemberID) {
    return res.json({ newMemberID: newMemberID }).status(200);
  } else {
    return false
  }
}
