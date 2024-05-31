import express from "express";
import { GetLedgerService } from "../services/GetLedgerService";

export async function GetLedgerController(
  req: express.Request,
  res: express.Response,
) {
  const fieldsRequired = [
    "memberID",
    "numRows",
    //"startRow", can't be required because sometimes needs to be 0
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
    const responseData = await GetLedgerService(
      req.body.memberID,
      req.body.numRows,
      req.body.startRow,
    );
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
