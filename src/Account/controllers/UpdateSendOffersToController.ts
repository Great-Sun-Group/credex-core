import express from "express";
import { UpdateSendOffersToService } from "../services/UpdateSendOffersToService";

export async function UpdateSendOffersToController(
  req: express.Request,
  res: express.Response
) {
  const requiredFields = ["accountIDtoSendOffers", "companyID", "ownerID"];

  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ message: `${field} is required` });
    }
  }

  try {
    const responseData = await UpdateSendOffersToService(
      req.body.accountIDtoSendOffers,
      req.body.companyID,
      req.body.ownerID
    );

    if (!responseData) {
      return res
        .status(400)
        .json({ message: "Failed to update offer recipient for company" });
    }

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Error updating offer recipient for company:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
