import axios from "axios";
import cheerio from "cheerio";
import logger from "../../../config/logger";

const https = require("https");

const url = "https://www.rbz.co.zw/index.php";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // To Ignore SSL errors in dev
});

export async function fetchZigRate(): Promise<
  { currency: string; bid: string; ask: string; avg: string }[]
> {
  try {
    logger.info("Fetching ZIG rate from RBZ website");
    const { data } = await axios.get(url, { httpsAgent });
    const parsedHtml = cheerio.load(data);

    const rates: { currency: string; bid: string; ask: string; avg: string }[] =
      [];

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
    
    logger.info("ZIG rates fetched successfully", { ratesCount: rates.length });
    return rates;
  } catch (error) {
    logger.error("Error fetching exchange rates", { error });
    return [];
  }
}
