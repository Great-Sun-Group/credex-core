import axios from "axios";
import _ from "lodash";
import { logInfo, logWarning, logError, logDCORates } from "../../../utils/logger";
import { getDenominations, Denomination } from "../../../constants/denominations";
import { validateDenomination, validateAmount } from "../../../utils/validators";
import { fetchZwgRate, ZwgRateError, ExchangeRate } from "../fetchZwgRate";
import { GetSecuredAuthorizationService } from "../../../api/Credex/services/GetSecuredAuthorization";
import { Rates, DCOResult, Participant } from "./types";

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
  session: any,
  USDbaseRates: Rates
): Promise<DCOResult> {
  logInfo("Processing DCO participants");
  const denomsInXAU = _.mapValues(
    USDbaseRates,
    (value) => value / USDbaseRates.XAU
  );

  const result = await session.run(`
    MATCH (daynode:Daynode{Active:true})
    MATCH (DCOparticipantsDeclared:Account)<-[:OWNS]-(DCOmember:Member)
    WHERE DCOparticipantsDeclared.DCOgiveInCXX > 0
    RETURN
      DCOparticipantsDeclared.accountID AS accountID,
      DCOmember.memberID AS DCOmemberID,
      DCOparticipantsDeclared.DCOgiveInCXX AS DCOgiveInCXX,
      DCOparticipantsDeclared.DCOgiveInCXX / daynode[DCOparticipantsDeclared.DCOdenom] AS DCOgiveInDenom,
      DCOparticipantsDeclared.DCOdenom AS DCOdenom
  `);

  const declaredParticipants = result.records;
  logInfo(`Declared participants: ${declaredParticipants.length}`);

  let DCOinCXX = 0;
  let DCOinXAU = 0;
  const confirmedParticipants: Participant[] = [];

  for (const participant of declaredParticipants) {
    const { accountID, DCOmemberID, DCOdenom, DCOgiveInCXX, DCOgiveInDenom } =
      participant.toObject();

    if (
      !validateDenomination(DCOdenom) ||
      !validateAmount(DCOgiveInCXX) ||
      !validateAmount(DCOgiveInDenom)
    ) {
      logWarning("Invalid participant data", {
        accountID,
        DCOmemberID,
        DCOdenom,
        DCOgiveInCXX,
        DCOgiveInDenom,
      });
      continue;
    }

    const { securableAmountInDenom } = await GetSecuredAuthorizationService(
      accountID,
      DCOdenom
    );

    if (DCOgiveInDenom <= securableAmountInDenom) {
      confirmedParticipants.push({
        accountID,
        DCOmemberID,
        DCOdenom,
        DCOgiveInCXX,
        DCOgiveInDenom,
      });
      DCOinCXX += DCOgiveInCXX;
      DCOinXAU += DCOgiveInDenom / denomsInXAU[DCOdenom];
    }
  }

  const numberConfirmedParticipants = confirmedParticipants.length;
  const nextCXXinXAU = DCOinXAU / numberConfirmedParticipants;
  const CXXprior_CXXcurrent = DCOinCXX / numberConfirmedParticipants;

  logInfo(`Confirmed participants: ${numberConfirmedParticipants}`);
  logInfo(`DCO in CXX: ${DCOinCXX}`);
  logInfo(`DCO in XAU: ${DCOinXAU}`);
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
    DCOinXAU,
    numberConfirmedParticipants,
    confirmedParticipants,
  };
}
