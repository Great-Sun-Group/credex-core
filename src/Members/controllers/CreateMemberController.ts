import express from "express";
import { CreateMemberService } from "../services/CreateMemberService";

export function CreateMemberController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = [
    "memberType",
    "defaultDenom",
    "handle",
    "phone",
    "firstname",
    "lastname",
    "companyname",
    "DailyCoinOfferingGive",
    "DailyCoinOfferingDenom",
  ];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }
  CreateMemberService(req.body);
  return res.json({ message: "Member created successfully" }).status(200);
}
