import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { getDenominations } from '../constants/denominations';
import { CreateMemberService } from '../../Member/services/CreateMemberService';
import { CreateCompanyService } from '../../Member/services/CreateCompanyService';
import { OfferCredexService } from '../../Credex/services/OfferCredexService';
import { AcceptCredexService } from '../../Credex/services/AcceptCredexService';
import axios from 'axios';
import { Credex } from "../../Credex/types/Credex";
var moment = require('moment-timezone');
const _ = require("lodash");

export async function DBinitialization() {

  console.log("DBinitialization start")

  console.log("establish dayZero")
  var dayOneUnformatted = moment('2023-06-21').utc();//first day hardcoded for test runs requiring daynode progression
  //var dayOneUnformatted = moment().utc();//first day today for prod start
  var dayZero = dayOneUnformatted.subtract(1, "days").format('YYYY-MM-DD')
  console.log("dayZero: " + dayZero)

  console.log("declare 1.000 CXX starting value");
  const OneCXXinCXXdenom = 1
  const CXXdenom = "CAD"
  console.log(OneCXXinCXXdenom + " CXX = 1 " + CXXdenom);

  console.log('load currencies and current rates')
  const symbolsForOpenExchangeRateApi = getDenominations({
    sourceForRate: "OpenExchangeRates",
    formatAsList: true
  });

  // docs: https://docs.openexchangerates.org/reference/historical-json
  var baseUrl = "https://openexchangerates.org/api/historical/" + dayZero + ".json?app_id=" + process.env.OPEN_EXCHANGE_RATES_API + "&symbols=" + symbolsForOpenExchangeRateApi;
  var ratesRequest = await axios.get(baseUrl);
  var USDbaseRates = ratesRequest.data.rates;

  //convert USD base rate from query to XAU
  var XAUbaseRates: any = {};
  _.forOwn(USDbaseRates, (value: number, key: string) => {
    XAUbaseRates[key] = value / USDbaseRates.XAU;
  });

  console.log('establish dayZero CXX rates using declared 1.000 CXX starting value')
  var dayZeroCXXrates: any = {};
  _.forOwn(XAUbaseRates, (value: number, key: string) => {
    dayZeroCXXrates[key] = 1 / value * OneCXXinCXXdenom * XAUbaseRates[CXXdenom];
  });
  //add CXX to rates
  dayZeroCXXrates.CXX = 1
  console.log('dayZeroCXXrates')
  console.log(dayZeroCXXrates)

  const ledgerSpaceSession = ledgerSpaceDriver.session()

  console.log("set CXX values on dayZero dayNode")
  var CreateDayNodeQuery = await ledgerSpaceSession.run(`
        CREATE (dayNode:DayNode)
        SET dayNode = $dayZeroCXXrates
        SET dayNode.Date = $dayZero
        SET dayNode.Active = TRUE
        SET dayNode.DCOrunningNow = TRUE
  `, {
    dayZeroCXXrates: dayZeroCXXrates,
    dayZero: dayZero
  })

  console.log("create initialization members and relationships");
  const credexFoundationID = await CreateMemberService({
    "memberType": "CREDEX_FOUNDATION",
    "companyname": "Credex Foundation",
    "handle": "credexfoundation",
    "defaultDenom": "CXX",
  })

  const rdubsID = await CreateMemberService({
    "memberType": "HUMAN",
    "firstname": "Ryan",
    "lastname": "Watson",
    "handle": "ryanlukewatson",
    "defaultDenom": "USD",
    "phone": "+263778177125",
    "DailyCoinOfferingGive": OneCXXinCXXdenom,
    "DailyCoinOfferingDenom": CXXdenom,
  })

  const greatSun = await CreateCompanyService({
    "companyname": "Great Sun Financial",
    "handle": "greatsunfinancial",
    "defaultDenom": "USD"},
    rdubsID)
  const greatSunID = greatSun.companyID

  await ledgerSpaceSession.run(`
    //create to secure participation in first DCO
    MATCH (credexFoundation:Member{memberID:$credexFoundationID})
    MATCH (greatSun:Member{memberID:$greatSunID})
    MERGE (credexFoundation)-[:CREDEX_FOUNDATION_AUDITED]->(greatSun)
    MERGE (credexFoundation)-[:CREDEX_FOUNDATION_AUDITED]->(credexFoundation)
  `, {
    credexFoundationID: credexFoundationID,
    greatSunID: greatSunID,
    rdubsID: rdubsID
  })

  //charging an account for participation in first DCO
  const credexData: Credex = {
    "issuerMemberID": greatSunID,
    "receiverMemberID": rdubsID,
    "Denomination": CXXdenom,
    "InitialAmount": OneCXXinCXXdenom*2,// *2 just to make sure secured balance is there
    "credexType": "PURCHASE",
    "dueDate": "",
    "securedCredex": true
  }
  const DCOinitializationOfferCredex = await OfferCredexService(credexData)
  await AcceptCredexService(DCOinitializationOfferCredex)
  await ledgerSpaceSession.close()
  
}