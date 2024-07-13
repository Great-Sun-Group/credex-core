import express from "express";
import { AcceptCredexService } from "../services/AcceptCredex";

export async function AcceptCredexBulkController(
  req: express.Request,
  res: express.Response
) {
  if (
    !Array.isArray(req.body) ||
    !req.body.every((id) => typeof id === "string")
  ) {
    return res
      .status(400)
      .json({ message: "Array of credexIDs to accept is required" });
  }

  try {
    const fullResponseData = await Promise.all(
      req.body.map((credexID) => AcceptCredexService(credexID))
    );
    res.json(fullResponseData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
