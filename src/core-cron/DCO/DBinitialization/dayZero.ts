import { DatabaseSessions, DayZeroRates } from "./types";
import { getDenominations } from "../../../constants/denominations";
import { fetchZwgRate, ZwgRateError } from "../fetchZwgRate";
import axios from "axios";
import _ from "lodash";
import moment from "moment-timezone";
import logger from "../../../utils/logger";

/**
 * Establishes the day zero date.
 */
export function establishDayZero(requestId: string): string {
  logger.info("Establishing day zero", { requestId });
  const dayZero =
    process.env.NODE_ENV === "development"
      ? "2021-01-01"
      : moment.utc().subtract(1, "days").format("YYYY-MM-DD");
  logger.info("Day zero established", { dayZero, requestId });
  return dayZero;
}

/**
 * Fetches and processes currency rates for day zero.
 */
export async function fetchAndProcessRates(
  dayZero: string,
  requestId: string
): Promise<DayZeroRates> {
  logger.info("Loading currencies and current rates...", { requestId });
  const symbols = getDenominations({
    sourceForRate: "OpenExchangeRates",
    formatAsList: true,
  });
  const baseUrl = `https://openexchangerates.org/api/historical/${dayZero}.json?app_id=${process.env.OPEN_EXCHANGE_RATES_API}&symbols=${symbols}`;

  const {
    data: { rates: USDbaseRates },
  } = await axios.get(baseUrl);

  try {
    const zigRate = (await fetchZwgRate())[1].avg;
    USDbaseRates.ZWG = zigRate;
    logger.info("ZWG rate fetched successfully", { rate: zigRate, requestId });
  } catch (error) {
    if (error instanceof ZwgRateError) {
      logger.warn(
        "Failed to fetch ZWG rate, excluding ZWG from denominations",
        { requestId, error: error.message }
      );
      delete USDbaseRates.ZWG;
    } else {
      logger.error("Unexpected error while fetching ZWG rate", {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  const OneCXXinCXXdenom = 1;
  const CXXdenom = "CAD";
  logger.info("CXX conversion rate", {
    rate: `${OneCXXinCXXdenom} CXX = 1 ${CXXdenom}`,
    requestId,
  });

  const XAUbaseRates = _.mapValues(
    USDbaseRates,
    (value) => value / USDbaseRates.XAU
  );
  const tempRates = _.mapValues(
    XAUbaseRates,
    (value) => (1 / value) * OneCXXinCXXdenom * XAUbaseRates[CXXdenom]
  );

  // Ensure all required properties are present
  const dayZeroCXXrates: DayZeroRates = {
    CXX: 1,
    CAD: tempRates.CAD || 1,
    USD: tempRates.USD || 1,
    XAU: tempRates.XAU || 1,
    ...tempRates // Include any additional rates
  };

  logger.info("Day zero CXX rates calculated", { dayZeroCXXrates, requestId });
  return dayZeroCXXrates;
}

/**
 * Creates the day zero daynode in the database.
 */
export async function createDayZeroDaynode(
  { ledgerSpace }: DatabaseSessions,
  dayZero: string,
  dayZeroCXXrates: DayZeroRates,
  requestId: string
): Promise<void> {
  logger.info("Creating day zero daynode...", { requestId });
  await ledgerSpace.run(
    `
    CREATE (daynode:Daynode)
    SET daynode = $dayZeroCXXrates,
        daynode.Date = date($dayZero),
        daynode.Active = TRUE,
        daynode.DCOrunningNow = TRUE
  `,
    { dayZeroCXXrates, dayZero }
  );
  logger.info("Day zero daynode created successfully", { requestId });
}
