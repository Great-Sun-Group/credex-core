import express from "express";
import { CreateCompanyService } from "../services/CreateCompanyService";
import { Member } from "../types/Member";

export async function CreateCompanyController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = [
    "ownerID",
    "companyname",
    "defaultDenom",
    "handle",
  ];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }
  const companyAsMemberData: Member = {
    memberType: "COMPANY",
    companyname: req.body.companyname,
    defaultDenom: req.body.defaultDenom,
    handle: req.body.handle,
  }

  const newCompany = await CreateCompanyService(companyAsMemberData, req.body.ownerID);
  if (newCompany) {
    return res.json(newCompany).status(200);
  } else {
    return false
  }
}