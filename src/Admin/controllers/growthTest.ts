import express from "express";
import { GrowthTestService } from "../services/GrowthTest";

export async function GrowthTestController(
  req: express.Request,
  res: express.Response
) {
  const fieldsRequired = [
    "numberDays",
    "accountGrowthRate",
    "USD_ANCHORED_fractionToPurchase",
    "USD_ANCHORED_amountPerPurchaseLow",
    "USD_ANCHORED_amountPerPurchaseHigh",
    "USD_ANCHORED_fractionToSell",
    "ZIG_ANCHORED_fractionToPurchase",
    "ZIG_ANCHORED_amountPerPurchaseLow",
    "ZIG_ANCHORED_amountPerPurchaseHigh",
    "ZIG_ANCHORED_fractionToSell",
    "dailyFloatingRandomTransactionsPerAccount",
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
    const responseData = await GrowthTestService(req.body);
    res.status(200).json(responseData);
  } catch (err) {
    // Handle errors and send an appropriate error response
    console.error("Error in growthTest:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
