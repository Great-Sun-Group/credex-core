import express from "express";
import { GetMembersListService } from "../services/GetMembersListService";

export async function GetMembersListController(
  req: express.Request,
  res: express.Response,
) {
  const { numRows, startRow } = req.body;

  // Check if required fields are provided
  if (!numRows || !startRow) {
    return res
      .status(400)
      .json({ message: "Both 'numRows' and 'startRow' are required" });
  }

  try {
    const members = await GetMembersListService(numRows, startRow);

    // Check if members array is empty
    if (members.length === 0) {
      return res.status(404).json({ message: "No members found" });
    }

    res.status(200).json(members);
  } catch (err) {
    console.error("Error retrieving members list:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
