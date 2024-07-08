import express from "express";
import { GetAccountsListService } from "../services/GetAccountsListService";

export async function GetAccountsListController(
  req: express.Request,
  res: express.Response
) {
  const { numRows, startRow } = req.body;

  // Check if required fields are provided
  if (!numRows || !startRow) {
    return res
      .status(400)
      .json({ message: "Both 'numRows' and 'startRow' are required" });
  }

  try {
    const accounts = await GetAccountsListService(numRows, startRow);

    // Check if accounts array is empty
    if (accounts.length === 0) {
      return res.status(404).json({ message: "No accounts found" });
    }

    res.status(200).json(accounts);
  } catch (err) {
    console.error("Error retrieving accounts list:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
