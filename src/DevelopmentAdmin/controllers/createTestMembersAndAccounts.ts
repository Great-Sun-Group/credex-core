import express from "express";
import { CreateTestMembersAndAccountsService } from "../services/CreateTestMembersAndAccounts";

export async function CreateTestMembersAndAccountsController(
  req: express.Request,
  res: express.Response
) {
  // Check if numNewAccounts is provided in the request body
  if (!req.body.numNewAccounts) {
    return res.status(400).json({ message: "numNewAccounts is required" });
  }

  try {
    // Call the service to create test accounts
    const responseData = await CreateTestMembersAndAccountsService(
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
