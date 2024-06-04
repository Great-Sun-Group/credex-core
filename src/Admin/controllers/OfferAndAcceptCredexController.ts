import express from "express";
import { OfferCredexService } from "../../Credex/services/OfferCredexService";
import { AcceptCredexService } from "../../Credex/services/AcceptCredexService";

export async function OfferAndAcceptCredexController(
  req: express.Request,
  res: express.Response,
) {
  const fieldsRequired = [
    "issuerMemberID",
    "receiverMemberID",
    "Denomination",
    "InitialAmount",
  ];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }
  try {
    const responseDataOffer = await OfferCredexService(req.body);
    const responseDataAccept = await AcceptCredexService(responseDataOffer.credex.credexID);
    res.json(responseDataAccept);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
