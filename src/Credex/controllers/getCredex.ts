import express from "express";
import { GetCredexService } from "../services/GetCredex";

export async function GetCredexController(
  req: express.Request,
  res: express.Response
) {
  try {
    const responseData = await GetCredexService(
      req.body.credexID,
      req.body.accountID
    );
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
