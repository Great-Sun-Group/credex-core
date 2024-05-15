import { CreateCredexService } from "./CreateCredexService";
import { Credex } from "../types/Credex";


export async function OfferCredexService(credexData: Credex) {
  credexData.OFFERSorREQUESTS = "OFFERS";
  credexData.credexType = "PURCHASE";
  return await CreateCredexService(credexData)
}