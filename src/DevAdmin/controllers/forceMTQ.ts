import express from "express";
import { MinuteTransactionQueue } from "../../Core/MTQ/MinuteTransactionQueue";

export async function ForceMtqController(
  req: express.Request,
  res: express.Response
) {
  try {
    const responseData = await MinuteTransactionQueue();
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
