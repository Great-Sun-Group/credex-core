/*
creates a credex as an offer
requires all data for CreateCredexService
adds fields to indicate credex is an offer and a purchase
returns data passed out from CreateCredexService
*/

import { CreateCredexService } from "./CreateCredexService";
import { Credex } from "../types/Credex";

export async function OfferCredexService(credexData: Credex) {
  try {
    credexData.OFFERSorREQUESTS = "OFFERS";
    credexData.credexType = "PURCHASE";
    const newCredex = await CreateCredexService(credexData);
    console.log(newCredex.message);
    return newCredex;
  } catch (error) {
    console.error("Error offering credex:", error);
    throw error; // Optionally rethrow to allow further handling upstream
  }
}
