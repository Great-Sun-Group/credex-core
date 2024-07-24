import express from "express";
import { ClearDevDbService } from "../services/ClearDevDb";

export async function ClearDevDbController(
  req: express.Request,
  res: express.Response,
) {
  try {
    // Call the service to clear the development database
    await ClearDevDbService();

    // Send a success response
    res
      .status(200)
      .json({ message: "Development databases cleared successfully" });
  } catch (err) {
    // Handle errors and send an appropriate error response
    console.error("Error clearing development databases:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}