import express from "express";
import { GetOwnedCompaniesService } from "../services/GetOwnedCompaniesService";
import { GetAuthorizedForCompaniesService } from "../services/GetAuthorizedForCompaniesService";

export async function GetOwnedAndAuthForCompaniesController(
    req: express.Request,
    res: express.Response
) {
    const { memberID } = req.body;

    // Check if memberID is provided
    if (!memberID) {
        return res.status(400).json({ message: "MemberID is required" });
    }

    try {
        // Get owned companies
        const ownedCompanies = await GetOwnedCompaniesService(memberID);

        // Get authorized companies
        const authorizedCompanies = await GetAuthorizedForCompaniesService(memberID);

        // Combine the responses
        const responseData = {
            ownedCompanies,
            authorizedCompanies,
        };

        res.status(200).json(responseData);
    } catch (err) {
        console.error("Error retrieving owned and authorized companies:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
