import express from "express";
import { GetLedgerService } from "../services/GetLedgerService";

export async function GetLedgerController(
  req: express.Request,
  res: express.Response
) {
  try {
    const responseData = await GetLedgerService(
      req.body.accountID,
      req.body.numRows,
      req.body.startRow
    );
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
