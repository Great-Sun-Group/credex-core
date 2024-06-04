import express from "express";
import { GetPendingOffersOutService } from "../services/GetPendingOffersOutService";

export async function GetPendingOffersOutController(
  req: express.Request,
  res: express.Response,
) {
  const memberID = req.body.memberID;
  try {
    const responseData = await GetPendingOffersOutService(memberID);
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
