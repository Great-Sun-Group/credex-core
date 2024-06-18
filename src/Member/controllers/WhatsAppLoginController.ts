import express from "express";
import { GetHumanMemberByPhoneService } from "../services/GetHumanMemberByPhoneService";
import { GetOwnedCompaniesService } from "../services/GetOwnedCompaniesService";
import { GetAuthorizedForCompaniesService } from "../services/GetAuthorizedForCompaniesService";
import { GetSecuredAuthorizationService } from "../../Credex/services/GetSecuredAuthorizationService";

export async function WhatsAppLoginController(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const humanMemberData = await GetHumanMemberByPhoneService(req.body.phone);
    if (humanMemberData) {

      const ownedCompanies = await GetOwnedCompaniesService(humanMemberData.memberID);
      const authorizedForCompanies = await GetAuthorizedForCompaniesService(humanMemberData.memberID);

      res.status(200).json({
        humanMemberData,
        ownedCompanies,
        authorizedForCompanies,
      });
    } else {
      res.status(404).json({ message: "Member not found" });
    }
  } catch (err) {
    console.error("Error retrieving member:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
