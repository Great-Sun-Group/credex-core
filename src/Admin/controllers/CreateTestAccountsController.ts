import express from "express";
import { CreateTestAccountsService } from "../services/CreateTestAccountsService";

export async function CreateTestAccountsController(
  req: express.Request,
  res: express.Response
) {
  // Check if numNewAccounts is provided in the request body
  if (!req.body.numNewAccounts) {
    return res.status(400).json({ message: "numNewAccounts is required" });
  }

  try {
    // Call the service to create test accounts
    const responseData = await CreateTestAccountsService(
      req.body.numNewAccounts
    );

    // Send the response with the created test accounts
    res.status(200).json(responseData);
  } catch (err) {
    // Handle errors and send an appropriate error response
    console.error("Error creating test accounts:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
