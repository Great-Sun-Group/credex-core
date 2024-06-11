import axios from "axios";
var moment = require("moment-timezone");
const _ = require("lodash");
import { ledgerSpaceDriver, searchSpaceDriver } from "../../config/neo4j/neo4j";
import { getDenominations } from "../constants/denominations";
import { GetSecuredAuthorizationService } from "../../Credex/services/GetSecuredAuthorizationService";
import { OfferCredexService } from "../../Credex/services/OfferCredexService";
import { AcceptCredexService } from "../../Credex/services/AcceptCredexService";
import { Credex } from "../../Credex/types/Credex";
import { fetchZigRate } from "./fetchZigRate";

export async function DCOexecute() {
  console.log("DCOexecute start");
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  console.log("fetch expiring daynode and set DCOrunningNow flag");
  var getPriorDaynodeData = await ledgerSpaceSession.run(`
        MATCH (daynode:DayNode{Active:TRUE})
        SET daynode.DCOrunningNow = true
        RETURN daynode
    `);
  const priorDaynode = getPriorDaynodeData.records[0].get("daynode").properties;
  console.log("previous day: " + priorDaynode.Date);
  var nextDate = moment(priorDaynode.Date).add(1, "days").format("YYYY-MM-DD");
  console.log("new day: " + nextDate);

  console.log("run defaults for expiring day");
  var DCOdefaulting = await ledgerSpaceSession.run(`
        OPTIONAL MATCH
            (member1:Member)-[rel1:OWES]->
            (defaulting:Credex)-[rel2:OWES]->
            (member2:Member)
        MATCH (dayNode:DayNode{Active:TRUE})
        WHERE defaulting.DueDate <= dayNode.Date
        AND defaulting.DefaultedAmount <= 0
        SET defaulting.DefaultedAmount = defaulting.OutstandingAmount
        SET defaulting.ActiveInterestRate = defaulting.rateOnDefault
        CREATE (defaulting)-[:DEFAULTED_ON]->(dayNode)
        RETURN defaulting.credexID AS defaultingCredexes
    `);

  //delete defaulted credexes from SearchSpace
  if (DCOdefaulting.records[0]) {
    DCOdefaulting.records.forEach(async function (record) {
      var defaultingInSearchSpace = await searchSpaceSession.run(
        `
                MATCH (issuer:Member)-[defaultingCredex:CREDEX WHERE defaultingCredex.credexID = $credexID]-(acceptor:Member)
                DELETE defaultingCredex
                `,
        {
          credexID: record.get("credexID"),
        },
      );
    });
  }

  console.log("load currencies and current rates");
  const symbolsForOpenExchangeRateApi = getDenominations({
    sourceForRate: "OpenExchangeRates",
    formatAsList: true,
  });

  // https://exchangeratesapi.io/documentation/
  var baseUrl =
    "https://openexchangerates.org/api/historical/" +
    nextDate +
    ".json?app_id=" +
    process.env.OPEN_EXCHANGE_RATES_API +
    "&symbols=" +
    symbolsForOpenExchangeRateApi;
  var ratesRequest = await axios.get(baseUrl);
  var USDbaseRates = ratesRequest.data.rates;

  //this always gets current rates (not historical for dev)
  const ZIGrates = await fetchZigRate();
  USDbaseRates.ZIG = ZIGrates[1].avg;

  //convert USD rates to XAU
  var denomsInXAU: any = {};
  _.forOwn(USDbaseRates, (value: number, key: string) => {
    denomsInXAU[key] = value / USDbaseRates.XAU;
  });

  console.log("get declared DCO participants");
  var getDCOparticpantsDeclared = await ledgerSpaceSession.run(`
        MATCH (DCOparticpantsDeclared:Member)
        WHERE DCOparticpantsDeclared.DailyCoinOfferingGive > 0
        RETURN
            DCOparticpantsDeclared.memberID AS memberID,
            DCOparticpantsDeclared.DailyCoinOfferingGive AS DailyCoinOfferingGive,
            DCOparticpantsDeclared.DailyCoinOfferingDenom AS DailyCoinOfferingDenom
        `);
  const declaredParticipants = getDCOparticpantsDeclared.records;
  console.log("filter participants for secured balance to participate in DCO");
  const confirmedParticipants = [];
  var DCOinCXX = 0;
  var DCOinXAU = 0;
  var numberConfirmedParticiants = 0;
  for (const declaredParticipant of declaredParticipants) {
    var securableData = await GetSecuredAuthorizationService(
      declaredParticipant.get("memberID"),
      declaredParticipant.get("DailyCoinOfferingDenom")
    );
    if (
      declaredParticipant.get("DailyCoinOfferingGive") <=
      securableData.securableAmountInDenom
    ) {
      confirmedParticipants.push(declaredParticipant);
      DCOinCXX = DCOinCXX + declaredParticipant.get("DailyCoinOfferingGive");
      DCOinXAU =
        DCOinXAU +
        //amount in CXX
        declaredParticipant.get("DailyCoinOfferingGive") /
          //converted to amount in XAU at new rate rate
          denomsInXAU[declaredParticipant.get("DailyCoinOfferingDenom")];
      numberConfirmedParticiants = numberConfirmedParticiants + 1;
    }
  }

  const nextCXXinXAU = DCOinXAU / numberConfirmedParticiants;
  const CXXprior_CXXcurrent = DCOinCXX / numberConfirmedParticiants;
  console.log("numberConfirmedParticiants: " + numberConfirmedParticiants);
  console.log("DCOinCXX: " + DCOinCXX);
  console.log("DCOinXAU: " + DCOinXAU);
  console.log("nextCXXinXAU: " + nextCXXinXAU);

  var newCXXrates: any = {};
  _.forOwn(denomsInXAU, (value: number, key: string) => {
    newCXXrates[key] = 1 / nextCXXinXAU / value;
  });
  //add CXX to rates
  newCXXrates.CXX = 1;
  console.log("newCXXrates:");
  console.log(newCXXrates);

  console.log("create new daynode");
  var newDaynodeQuery = await ledgerSpaceSession.run(
    `
        MATCH (expiringDayNode:DayNode{Active:TRUE})
        CREATE (expiringDayNode)-[:NEXT_DAY]->(nextDayNode:DayNode)
        SET
            expiringDayNode.Active = false,
            expiringDayNode.DCOrunningNow = false,
            nextDayNode = $newCXXrates,
            nextDayNode.CXXprior_CXXcurrent = $CXXprior_CXXcurrent,
            nextDayNode.Date = date($nextDate),
            nextDayNode.Active = true,
            nextDayNode.DCOrunningNow = true
    `,
    {
      newCXXrates: newCXXrates,
      nextDate: nextDate,
      CXXprior_CXXcurrent: CXXprior_CXXcurrent,
    },
  );

  console.log("create DCO give transactions");
  const getFoundationID = await ledgerSpaceSession.run(`
        MATCH (credexFoundation:Member{memberType:"CREDEX_FOUNDATION"})
        RETURN credexFoundation.memberID AS foundationID
    `);
  const foundationID = getFoundationID.records[0].get("foundationID");

  for (const confirmedParticipant of confirmedParticipants) {
    const dataForDCOgive: Credex = {
      issuerMemberID: confirmedParticipant.get("memberID"),
      receiverMemberID: foundationID,
      Denomination: "CAD",
      InitialAmount: confirmedParticipant.get("DailyCoinOfferingGive"),
      credexType: "DCO_GIVE",
      securedCredex: true,
    };
    const DCOgiveCredex = await OfferCredexService(dataForDCOgive);
    await AcceptCredexService(DCOgiveCredex.credex.credexID);
  }

  console.log("new daynode initialized, DCOgive created");

  console.log("updating credex and asset balances");
  var updateLedgerSpaceBalancesQuery = await ledgerSpaceSession.run(`
        MATCH (newDayNode:DayNode{Active:TRUE})

        //update balances on all CXX credexes to the new rates
        MATCH (credcoinCredexes:Credex)
        WHERE credcoinCredexes.Denomination = "CXX"
        WITH DISTINCT credcoinCredexes, newDayNode
        UNWIND credcoinCredexes as thisCredex
        SET thisCredex.InitialAmount = thisCredex.InitialAmount/newDayNode.CXXprior_CXXcurrent
        SET thisCredex.OutstandingAmount = thisCredex.OutstandingAmount/newDayNode.CXXprior_CXXcurrent
        SET thisCredex.RedeemedAmount = thisCredex.RedeemedAmount/newDayNode.CXXprior_CXXcurrent
        SET thisCredex.DefaultedAmount = thisCredex.DefaultedAmount/newDayNode.CXXprior_CXXcurrent
        SET thisCredex.WrittenOffAmount = thisCredex.WrittenOffAmount/newDayNode.CXXprior_CXXcurrent
        SET thisCredex.CXXmultiplier = thisCredex.CXXmultiplier/newDayNode.CXXprior_CXXcurrent

        //update balances on all currency credexes to match the days rates
        WITH newDayNode
        MATCH (currencyCredexes:Credex)
        WHERE currencyCredexes.Denomination <> "CXX"
        WITH DISTINCT currencyCredexes, newDayNode
        UNWIND currencyCredexes as thisCredex
        SET thisCredex.InitialAmount = (thisCredex.InitialAmount*thisCredex.CXXmultiplier)/newDayNode[thisCredex.Denomination]
        SET thisCredex.OutstandingAmount = (thisCredex.OutstandingAmount*thisCredex.CXXmultiplier)/newDayNode[thisCredex.Denomination]
        SET thisCredex.RedeemedAmount = (thisCredex.RedeemedAmount*thisCredex.CXXmultiplier)/newDayNode[thisCredex.Denomination]
        SET thisCredex.DefaultedAmount = (thisCredex.DefaultedAmount*thisCredex.CXXmultiplier)/newDayNode[thisCredex.Denomination]
        SET thisCredex.WrittenOffAmount = (thisCredex.WrittenOffAmount*thisCredex.CXXmultiplier)/newDayNode[thisCredex.Denomination]
        SET thisCredex.CXXmultiplier = newDayNode[thisCredex.Denomination]

        //update balances on loopanchors (always CXX)
        WITH newDayNode
        MATCH (loopAnchors:LoopAnchor)
        WITH DISTINCT loopAnchors, newDayNode
        UNWIND loopAnchors as thisLoopAnchor
        SET thisLoopAnchor.LoopedAmount = thisLoopAnchor.LoopedAmount/newDayNode.CXXprior_CXXcurrent
        SET thisLoopAnchor.CXXmultiplier = thisLoopAnchor.CXXmultiplier/newDayNode.CXXprior_CXXcurrent

        //update balances on :REDEEMED relationships CXX
        WITH newDayNode
        MATCH (:Credex)-[redeemedRels:REDEEMED]->(:LoopAnchor)
        WHERE redeemedRels.Denomination = "CXX"
        WITH DISTINCT redeemedRels, newDayNode
        UNWIND redeemedRels as thisRedeemedRel
        SET thisRedeemedRel.AmountRedeemed = thisRedeemedRel.AmountRedeemed/newDayNode.CXXprior_CXXcurrent
        SET thisRedeemedRel.AmountOutstandingNow = thisRedeemedRel.AmountOutstandingNow/newDayNode.CXXprior_CXXcurrent
        SET thisRedeemedRel.CXXmultiplier = thisRedeemedRel.CXXmultiplier/newDayNode.CXXprior_CXXcurrent

        //update balances on :REDEEMED relationships currency
        WITH newDayNode
        MATCH (:Credex)-[redeemedRels:REDEEMED]->(:LoopAnchor)
        WHERE redeemedRels.Denomination <> "CXX"
        WITH DISTINCT redeemedRels, newDayNode
        UNWIND redeemedRels as thisRedeemedRel
        SET thisRedeemedRel.AmountRedeemed = thisRedeemedRel.AmountRedeemed/thisRedeemedRel.CXXmultiplier*newDayNode[thisRedeemedRel.Denomination]
        SET thisRedeemedRel.AmountOutstandingNow = thisRedeemedRel.AmountOutstandingNow/thisRedeemedRel.CXXmultiplier*newDayNode[thisRedeemedRel.Denomination]
        SET thisRedeemedRel.CXXmultiplier = newDayNode[thisRedeemedRel.Denomination]

        //update balances on :CREDLOOP relationships CXX
        WITH newDayNode
        MATCH (:Credex)-[credloopRels:CREDLOOP]->(:Credex)
        WHERE credloopRels.Denomination = "CXX"
        WITH DISTINCT credloopRels, newDayNode
        UNWIND credloopRels as thisCredloopRel
        SET thisCredloopRel.AmountRedeemed = thisCredloopRel.AmountRedeemed/newDayNode.CXXprior_CXXcurrent
        SET thisCredloopRel.AmountOutstandingNow = thisCredloopRel.AmountOutstandingNow/newDayNode.CXXprior_CXXcurrent
        SET thisCredloopRel.CXXmultiplier = thisCredloopRel.CXXmultiplier/newDayNode.CXXprior_CXXcurrent

        //update balances on :CREDLOOP relationships currency
        WITH newDayNode
        MATCH (:Credex)-[credloopRels:CREDLOOP]->(:Credex)
        WHERE credloopRels.Denomination <> "CXX"
        WITH DISTINCT credloopRels, newDayNode
        UNWIND credloopRels as thisCredloopRel
        SET thisCredloopRel.AmountRedeemed = thisCredloopRel.AmountRedeemed/thisCredloopRel.CXXmultiplier*newDayNode[thisCredloopRel.Denomination]
        SET thisCredloopRel.AmountOutstandingNow = thisCredloopRel.AmountOutstandingNow/thisCredloopRel.CXXmultiplier*newDayNode[thisCredloopRel.Denomination]
        SET thisCredloopRel.CXXmultiplier = newDayNode[thisCredloopRel.Denomination]
    `);

  // update balances in SearchSpace
  var updateSearchSpaceBalancesQuery = await searchSpaceSession.run(
    `
        MATCH (issuer:Member)-[credex:Credex]->(receiver:Member)
        WITH DISTINCT credex
        UNWIND credex as thisCredex
        SET thisCredex.Amount = thisCredex.InitialAmount/$CXXprior_CXXcurrent
    `,
    {
      CXXprior_CXXcurrent: CXXprior_CXXcurrent,
    },
  );

  console.log("...balances updated");

  console.log("create DCO receive transactions");
  for (const confirmedParticipant of confirmedParticipants) {
    const dataForDCOreceive: Credex = {
      issuerMemberID: foundationID,
      receiverMemberID: confirmedParticipant.get("memberID"),
      Denomination: "CXX",
      InitialAmount: 1,
      credexType: "DCO_RECEIVE",
      securedCredex: true,
      //dueDate: moment().add(1, "years").format("YYYY-MM-DD"),
    };
    const DCOreceiveCredex = await OfferCredexService(dataForDCOreceive);
    await AcceptCredexService(DCOreceiveCredex.credex.credexID);
  }
  console.log("DCOreceive transactions created");

  console.log("turn off DCOrunningNow flag");
  var DCOflagOff = await ledgerSpaceSession.run(`
        MATCH (daynode:DayNode{Active:TRUE})
        SET daynode.DCOrunningNow = false
    `);

  console.log("DCOexecute done to open " + nextDate);

  await ledgerSpaceSession.close();
  await searchSpaceSession.close();

  return true;
}
