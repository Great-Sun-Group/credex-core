import express from "express";
import { CreateTestMembersService } from "../services/CreateTestMembersService";

export async function CreateTestMembersController(
  req: express.Request, 
  res: express.Response
) {
  // Check if numNewMembers is provided in the request body
  if (!req.body.numNewMembers) {
    return res
      .status(400)
      .json({ message: "numNewMembers is required" });
  }

  try {   
    // Call the service to create test members
    const responseData = await CreateTestMembersService(req.body.numNewMembers);    

    // Send the response with the created test members
    res.status(200).json(responseData); 
  } catch (err) {
    // Handle errors and send an appropriate error response
    console.error("Error creating test members:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}