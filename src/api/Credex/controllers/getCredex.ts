import express from "express";
import { GetCredexService } from "../services/GetCredex";

export async function GetCredexController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = ["credexID", "accountID"];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }

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
