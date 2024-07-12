import express from "express";
import { OfferCredexService } from "../../Credex/services/OfferCredexService";
import { AcceptCredexService } from "../../Credex/services/AcceptCredexService";

export async function OfferAndAcceptCredexController(
  req: express.Request,
  res: express.Response
) {
  try {
    const responseDataOffer = await OfferCredexService(req.body);
    if (typeof responseDataOffer.credex == "boolean") {
      throw new Error("Invalid response from OfferCredexService");
    }
    if (
      responseDataOffer.credex &&
      typeof responseDataOffer.credex.credexID === "string"
    ) {
      const responseDataAccept = await AcceptCredexService(
        responseDataOffer.credex.credexID
      );
      res.json(responseDataAccept);
    } else {
      res.status(500).json(responseDataOffer.message);
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
