import express from "express";
import { CreateCompanyService } from "../services/CreateCompanyService";
import { Member } from "../types/Member";

export async function CreateCompanyController(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const fieldsRequired = ["ownerID", "companyname", "defaultDenom", "handle"];

  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      res.status(400).json({ message: `${field} is required` });
      return;
    }
  }

  const companyAsMemberData: Member = {
    memberType: "COMPANY",
    companyname: req.body.companyname,
    defaultDenom: req.body.defaultDenom,
    handle: req.body.handle,
  };

  try {
    const newCompany = await CreateCompanyService(
      companyAsMemberData,
      req.body.ownerID,
    );

    if (newCompany) {
      res.status(200).json(newCompany);
    } else {
      res.status(400).json({ message: "Failed to create company" });
    }
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
