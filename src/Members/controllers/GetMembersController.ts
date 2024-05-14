import express from "express";
import { GetMembersService } from "../services/GetMembersService";

export async function GetMembersController(
  req: express.Request, 
  res: express.Response
) {
  try {
    const members = await GetMembersService();
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}