import express from "express";
import { CancelCredexService } from "../services/CancelCredex";

export async function CancelCredexController(
  req: express.Request,
  res: express.Response,
) {
  const fieldsRequired = ["credexID"];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }
  try {
    const responseData = await CancelCredexService(req.body.credexID);
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
