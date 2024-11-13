import axios from "axios";
import _ from "lodash";
import {
  logInfo,
  logWarning,
  logError,
  logDCORates,
} from "../../../utils/logger";
import { getDenominations, Denomination } from "../../constants/denominations";
import {
  validateDenomination,
  validateAmount,
} from "../../../utils/validators";
import { fetchZwgRate, ZwgRateError, ExchangeRate } from "../fetchZwgRate";
import { Rates, DCOResult, ParticipantData } from "./types";

/**
 * Fetches and validates currency rates from external sources
 */
export async function fetchCurrencyRates(nextDate: string): Promise<Rates> {
  logInfo("Fetching currency rates");
  const symbols = getDenominations({
    sourceForRate: "OpenExchangeRates",
    formatAsList: true,
  }) as string;
  const {
    data: { rates: USDbaseRates },
  } = await axios.get(
    `https://openexchangerates.org/api/historical/${nextDate}.json`,
    { params: { app_id: process.env.OPEN_EXCHANGE_RATES_API, symbols } }
  );

  try {
    const ZWGrates: ExchangeRate[] = await fetchZwgRate();
    if (ZWGrates.length > 0) {
      const usdZwgRate = ZWGrates.find((rate) => rate.currency === "USD/ZWG");
      if (usdZwgRate) {
        USDbaseRates.ZWG = parseFloat(usdZwgRate.avg);
        logInfo(`ZWG rate fetched successfully: ${USDbaseRates.ZWG}`);
      } else {
        logWarning("USD/ZWG rate not found in fetched ZWG rates");
      }
    } else {
      logWarning("No ZWG rates fetched");
    }
  } catch (error) {
    if (error instanceof ZwgRateError) {
      logWarning(
        "Failed to fetch ZWG rate, excluding ZWG from denominations",
        error
      );
    } else {
      logError(
        "Unexpected error while fetching ZWG rate",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  validateRates(USDbaseRates);
  return USDbaseRates;
}

/**
 * Validates the fetched currency rates
 */
function validateRates(rates: Rates): void {
  const allDenoms = getDenominations({}) as Denomination[];
  const denomsToCheck = allDenoms.filter(
    (denom: Denomination) => denom.code !== "CXX"
  );

  const allValid = denomsToCheck.every(
    (denom: Denomination) =>
      rates.hasOwnProperty(denom.code) &&
      validateDenomination(denom.code) &&
      validateAmount(rates[denom.code])
  );

  if (!allValid) {
    throw new Error("Invalid or missing currency rates");
  }
}

/**
 * Establishes new CXX rates based on participant data
 */
export async function establishNewCXXrates(
  USDbaseRates: Rates,
  participantData: ParticipantData
): Promise<DCOResult> {
  const {
    DCOinCXX,
    DCOinXAU,
    numberConfirmedParticipants,
    confirmedParticipants,
  } = participantData;

  const denomsInXAU = _.mapValues(
    USDbaseRates,
    (value) => value / USDbaseRates.XAU
  );

  // Calculate total DCO in XAU by converting each participant's contribution
  let totalDCOinXAU = 0;
  for (const participant of confirmedParticipants) {
    totalDCOinXAU += participant.DCOgiveInDenom / denomsInXAU[participant.DCOdenom];
  }

  const nextCXXinXAU = totalDCOinXAU / numberConfirmedParticipants;
  const CXXprior_CXXcurrent = DCOinCXX / numberConfirmedParticipants;

  logInfo(`Next CXX in XAU: ${nextCXXinXAU}`);

  const newCXXrates = _.mapValues(
    denomsInXAU,
    (value) => 1 / nextCXXinXAU / value
  );
  newCXXrates.CXX = 1;

  logDCORates(denomsInXAU.XAU, newCXXrates.CXX, CXXprior_CXXcurrent);

  return {
    newCXXrates,
    CXXprior_CXXcurrent,
    DCOinCXX,
    DCOinXAU: totalDCOinXAU, // Use the properly calculated XAU total
    numberConfirmedParticipants,
    confirmedParticipants,
  };
}
