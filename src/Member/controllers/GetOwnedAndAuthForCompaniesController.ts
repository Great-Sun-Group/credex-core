import express from "express";
import { GetOwnedCompaniesService } from "../services/GetOwnedCompaniesService";
import { GetAuthorizedForCompaniesService } from "../services/GetAuthorizedForCompaniesService";

export async function GetOwnedAndAuthForCompaniesController(
    req: express.Request,
    res: express.Response
) {
    const fieldsRequired = [
        "memberID",
    ];
    for (const field of fieldsRequired) {
        if (!req.body[field]) {
            return res
                .status(400)
                .json({ message: `${field} is required` })
                .send();
        }
    }
    const memberID = req.body.memberID;
    try {
        const responseDataOwned = await GetOwnedCompaniesService(memberID);
        const responseDataAuthFor = await GetAuthorizedForCompaniesService(memberID);
        const fullResponseData = {
            "responseDataOwned": responseDataOwned,
            "responseDataAuthFor": responseDataAuthFor,
        }
        res.json(fullResponseData);
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
}