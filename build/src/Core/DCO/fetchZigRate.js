"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchZigRate = fetchZigRate;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const https = require("https");
const url = "https://www.rbz.co.zw/index.php";
const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // To Ignore SSL errors in dev
});
async function fetchZigRate() {
    try {
        const { data } = await axios_1.default.get(url, { httpsAgent });
        const parsedHtml = cheerio_1.default.load(data);
        const rates = [];
        parsedHtml("#baTab1 table tbody tr").each((index, element) => {
            const currency = parsedHtml(element)
                .find("td")
                .eq(0)
                .text()
                .trim();
            const bid = parsedHtml(element).find("td").eq(1).text().trim();
            const ask = parsedHtml(element).find("td").eq(2).text().trim();
            const avg = parsedHtml(element).find("td").eq(3).text().trim();
            if (currency && bid && ask && avg) {
                rates.push({ currency, bid, ask, avg });
            }
        });
        //console.log(rates);
        return rates;
    }
    catch (error) {
        console.error("Error fetching exchange rates:", error);
        return [];
    }
}
//# sourceMappingURL=fetchZigRate.js.map