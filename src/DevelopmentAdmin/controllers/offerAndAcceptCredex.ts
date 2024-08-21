import express from "express";
import { OfferCredexService } from "../../Credex/services/OfferCredex";
import { AcceptCredexService } from "../../Credex/services/AcceptCredex";

export async function OfferAndAcceptCredexController(
  req: express.Request,
  res: express.Response
) {
  try {
    /*
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
      if (responseDataAccept) {
        res.json(responseDataAccept.acceptedCredexID);
      }
    } else {
      res.status(500).json(responseDataOffer.message);
    }
      */
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
