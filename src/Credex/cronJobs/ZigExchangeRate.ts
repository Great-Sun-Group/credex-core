import axios from 'axios';
import cheerio from 'cheerio';
// import cron from 'node-cron';

const https = require('https');

const url = 'https://www.rbz.co.zw/index.php';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // To Ignore SSL errors in dev
});

async function fetchExchangeRates(): Promise<{ currency: string; bid: string; ask: string; avg: string }[]> {
  try {
    const { data } = await axios.get(url, { httpsAgent });
    const parsedHtml = cheerio.load(data);

    const rates: { currency: string; bid: string; ask: string; avg: string }[] = [];

    parsedHtml('#baTab1 table tbody tr').each((index: number, element: any) => {
      const currency: string = parsedHtml(element).find('td').eq(0).text().trim();
      const bid: string = parsedHtml(element).find('td').eq(1).text().trim();
      const ask: string = parsedHtml(element).find('td').eq(2).text().trim();
      const avg: string = parsedHtml(element).find('td').eq(3).text().trim();

      if (currency && bid && ask && avg) {
        rates.push({ currency, bid, ask, avg });
      }
    });
    console.log(rates);
    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return [];
  }
}

fetchExchangeRates();

// // Schedule this
// cron.schedule('0 0 * * *', () => {
//   console.log('Fetching exchange rates...');
//   fetchExchangeRates().then((rates) => {
//     console.log('Exchange Rates:', rates);
    
//   });
// });

// // Start the cron job
// console.log('Cron job started');
