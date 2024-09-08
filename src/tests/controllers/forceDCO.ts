import express from "express";
import { DailyCredcoinOffering } from "../../core-cron/DCO/DailyCredcoinOffering";

export async function ForceDcoController(
  req: express.Request,
  res: express.Response
) {
  try {
    const responseData = await DailyCredcoinOffering();
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
