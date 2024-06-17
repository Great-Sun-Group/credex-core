import express from "express";
import { AcceptCredexService } from "../services/AcceptCredexService";

export async function AcceptCredexController(
  req: express.Request,
  res: express.Response,
) {
  try {
    const responseData = await AcceptCredexService(req.body.credexID);
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
