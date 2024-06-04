import express from "express";
import { OfferCredexService } from "../services/OfferCredexService";

export async function OfferCredexController(
  req: express.Request,
  res: express.Response
) {

  try {
    const responseData = await OfferCredexService(req.body);
    res.json(responseData);
  } catch (err) {
    console.error('Error in OfferCredexController:', err);
    res.status(500).json({ error: (err as Error).message });
  }
}
