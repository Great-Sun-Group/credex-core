import axios from "axios";
import cheerio from "cheerio";
import logger from "../../utils/logger";

const https = require("https");

export interface ExchangeRate {
  currency: string;
  bid: string;
  ask: string;
  avg: string;
}

const RBZ_URL = "https://www.rbz.co.zw/index.php";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // To Ignore SSL errors in dev
});

function isValidRate(rate: string): boolean {
  return /^\d+(\.\d+)?$/.test(rate);
}

function validateRates(rates: ExchangeRate[]): void {
  if (rates.length === 0) {
    throw new Error("No rates fetched from RBZ website");
  }

  for (const rate of rates) {
    if (
      !rate.currency ||
      !isValidRate(rate.bid) ||
      !isValidRate(rate.ask) ||
      !isValidRate(rate.avg)
    ) {
      throw new Error(`Invalid rate data: ${JSON.stringify(rate)}`);
    }
  }
}

export class ZwgRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZwgRateError";
  }
}

export async function fetchZwgRate(): Promise<ExchangeRate[]> {
  try {
    logger.info("Fetching ZWG rate from RBZ website");
    const { data } = await axios.get(RBZ_URL, {
      httpsAgent,
      timeout: 10000, // 10 seconds timeout
    });

    const parsedHtml = cheerio.load(data);

    const rates: ExchangeRate[] = [];

    parsedHtml("#baTab1 table tbody tr").each((index: number, element: any) => {
      const currency: string = parsedHtml(element)
        .find("td")
        .eq(0)
        .text()
        .trim();
      const bid: string = parsedHtml(element).find("td").eq(1).text().trim();
      const ask: string = parsedHtml(element).find("td").eq(2).text().trim();
      const avg: string = parsedHtml(element).find("td").eq(3).text().trim();

      if (currency && bid && ask && avg) {
        rates.push({ currency, bid, ask, avg });
      }
    });

    validateRates(rates);

    logger.info("ZWG rates fetched successfully", { ratesCount: rates.length });
    return rates;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED") {
        logger.error("Timeout while fetching exchange rates from RBZ website");
      } else {
        logger.error(
          "Network error while fetching exchange rates from RBZ website",
          {
            status: error.response?.status,
            statusText: error.response?.statusText,
          }
        );
      }
    } else {
      logger.error("Error fetching or validating exchange rates", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    throw new ZwgRateError("Failed to fetch valid ZWG rates from RBZ website");
  }
}
