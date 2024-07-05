import express from "express";
import { GrowthTestService } from "../services/GrowthTestService";

export async function GrowthTestController(
  req: express.Request,
  res: express.Response
) {
    const fieldsRequired = [
      "numberDays",
      "memberGrowthRate",
      "dailyFractionOfMembersToConvertUSDcash",
      "amountConvertedUSDlow",
      "amountConvertedUSDhigh",
      "dailyFractionOfMembersToConvertZIGcash",
      "amountConvertedZIGlow",
      "amountConvertedZIGhigh",
      "dailyEcosystemTransactionsPerMember",
    ];
  for (const field of fieldsRequired) {
    if (!req.body[field]) {
      return res
        .status(400)
        .json({ message: `${field} is required` })
        .send();
    }
  }
  try {
      const responseData = await GrowthTestService(
        req.body.numberDays,
        req.body.memberGrowthRate,
        req.body.dailyFractionOfMembersToConvertUSDcash,
        req.body.amountConvertedUSDlow,
        req.body.amountConvertedUSDhigh,
        req.body.dailyFractionOfMembersToConvertZIGcash,
        req.body.amountConvertedZIGlow,
        req.body.amountConvertedZIGhigh,
        req.body.dailyEcosystemTransactionsPerMember
      );
    res.status(200).json(responseData);
  } catch (err) {
    // Handle errors and send an appropriate error response
    console.error("Error in growthTest:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
