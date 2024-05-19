// Controller for getting a single member record 
import express from "express";
import { GetMemberService } from "../services/GetMemberService";

export async function GetMemberController(
    req: express.Request,
    res: express.Response
) {
    const memberID = req.params.memberID;
    try {
        const responseData = await GetMemberService(memberID);
        res.json(responseData);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
}