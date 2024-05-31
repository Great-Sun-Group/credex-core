import express from "express";
import { GetBalancesService } from "../services/GetBalancesService";

export async function GetBalancesController(
  req: express.Request,
  res: express.Response,
) {
  const memberID = req.body.memberID;
  try {
    const responseData = await GetBalancesService(memberID);
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
