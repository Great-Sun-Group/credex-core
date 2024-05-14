import express from "express";
import { GetMembersListService } from "../services/GetMembersListService";

export async function GetMembersListController(
  req: express.Request, 
  res: express.Response
) {
  try {
    const members = await GetMembersListService();
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}