import express from "express";
import { CheckLedgerVsSearchBalances } from "../services/CheckLedgerVsSearchBalancesService";

export async function CheckLedgerVsSearchBalancesController(
  req: express.Request,
  res: express.Response
) {
  try {
    const balanceCheck = await CheckLedgerVsSearchBalances();

    // Send a success response
    res.status(200).json({ balanceCheck });
  } catch (err) {
    // Handle errors and send an appropriate error response
    console.error("Error checking balances:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
