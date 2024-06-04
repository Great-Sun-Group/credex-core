/*
creates a credex as an offer
requires all data for CreateCredexService
adds fields to indicate credex is an offer and a purchase
returns data passed out from CreateCredexService
*/

import { CreateCredexService } from "./CreateCredexService";
import { Credex } from "../types/Credex";

export async function OfferCredexService(credexData: Credex) {
  credexData.OFFERSorREQUESTS = "OFFERS";
  credexData.credexType = "PURCHASE";
  return await CreateCredexService(credexData);
}
