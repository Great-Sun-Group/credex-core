import axios from "axios";
import _ from "lodash";
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

  try {
    console.log("fetch expiring daynode and set DCOrunningNow flag");
    const priorDaynodeData = await ledgerSpaceSession.run(`
      MATCH (daynode:DayNode {Active: TRUE})
      SET daynode.DCOrunningNow = true
      RETURN
        daynode.Date AS previousDate,
        daynode.Date + Duration({days: 1}) AS nextDate
    `);
    const previousDate = priorDaynodeData.records[0].get("previousDate");
    const nextDate = priorDaynodeData.records[0].get("nextDate");

    console.log("Expiring day: " + previousDate);

    //process defaulting unsecured credexes
    let numberDefaulted = 0;
    const DCOdefaulting = await ledgerSpaceSession.run(`
      MATCH (daynode:DayNode {Active: TRUE})
      OPTIONAL MATCH (member1:Member)-[rel1:OWES]->(defaulting:Credex)-[rel2:OWES]->(member2:Member)
      WHERE defaulting.dueDate <= daynode.Date AND defaulting.DefaultedAmount <= 0
      SET defaulting.DefaultedAmount = defaulting.OutstandingAmount
      WITH defaulting, daynode
      UNWIND defaulting AS defaultingCredex
      CREATE (defaultingCredex)-[:DEFAULTED_ON]->(daynode)
      RETURN count(defaulting) AS numberDefaulted
    `);
    if (DCOdefaulting.records.length) {
      numberDefaulted = DCOdefaulting.records[0].get("numberDefaulted");
    }
    console.log("Defaults: " + numberDefaulted);

    //expire offers/requests that have been pending for more than a full day
    let numberExpiringPending = 0;
    const DCOexpiring = await ledgerSpaceSession.run(`
      MATCH (daynode:DayNode {Active: TRUE})
      OPTIONAL MATCH (:Member)-[rel1:OFFERS|REQUESTS]->(expiringPending:Credex)-[rel2:OFFERS|REQUESTS]->(:Member),
      (expiringPending)-[:CREATED_ON]->(createdDaynode:DayNode)
      WHERE createdDaynode.Date + Duration({days: 1}) < daynode.Date
      DELETE rel1, rel2
      RETURN count(expiringPending) AS numberExpiringPending
    `);
    if (DCOexpiring.records.length) {
      numberExpiringPending = DCOexpiring.records[0].get(
        "numberExpiringPending"
      );
    }
    console.log("Expired pending offers/requests: " + numberExpiringPending);

    console.log("Loading currencies and current rates");
    const symbolsForOpenExchangeRateApi = getDenominations({
      sourceForRate: "OpenExchangeRates",
      formatAsList: true,
    });
    const ratesRequest = await axios.get(
      `https://openexchangerates.org/api/historical/${nextDate}.json`,
      {
        params: {
          app_id: process.env.OPEN_EXCHANGE_RATES_API,
          symbols: symbolsForOpenExchangeRateApi,
        },
      }
    );
    const USDbaseRates = ratesRequest.data.rates;
    const ZIGrates = await fetchZigRate();
    USDbaseRates.ZIG = ZIGrates[1].avg;

    const denomsInXAU = _.mapValues(
      USDbaseRates,
      (value) => value / USDbaseRates.XAU
    );

    console.log("Fetching declared DCO participants");
    const DCOparticipantsDeclared = await ledgerSpaceSession.run(`
      MATCH (daynode:DayNode{Active:true})
      MATCH (DCOparticpantsDeclared:Member)
      WHERE DCOparticpantsDeclared.DCOgiveInCXX > 0
      RETURN DCOparticpantsDeclared.memberID AS memberID,
             DCOparticpantsDeclared.DCOgiveInCXX AS DCOgiveInCXX,
             DCOparticpantsDeclared.DCOgiveInCXX
              / daynode[DCOparticpantsDeclared.DCOdenom]
              AS DCOgiveInDenom,
             DCOparticpantsDeclared.DCOdenom AS DCOdenom
    `);

    console.log("Filtering participants for available secured balance");
    const declaredParticipants = DCOparticipantsDeclared.records;
    console.log("declaredParticipants: " + declaredParticipants.length);
    let DCOinCXX = 0;
    let DCOinXAU = 0;
    const confirmedParticipants = [];

    for (const declaredParticipant of declaredParticipants) {
      const memberID = declaredParticipant.get("memberID");
      const DCOdenom = declaredParticipant.get("DCOdenom");
      const DCOgiveInCXX = declaredParticipant.get("DCOgiveInCXX");
      const DCOgiveInDenom = declaredParticipant.get("DCOgiveInDenom");
      const securableData = await GetSecuredAuthorizationService(
        memberID,
        DCOdenom
      );

      if (DCOgiveInDenom <= securableData.securableAmountInDenom) {
        confirmedParticipants.push(declaredParticipant);
        DCOinCXX += DCOgiveInCXX;
        DCOinXAU += DCOgiveInDenom / denomsInXAU[DCOdenom];
      }
    }

    const numberConfirmedParticipants = confirmedParticipants.length;
    const nextCXXinXAU = DCOinXAU / numberConfirmedParticipants;
    const CXXprior_CXXcurrent = DCOinCXX / numberConfirmedParticipants;
    console.log("numberConfirmedParticipants: " + numberConfirmedParticipants);
    console.log("DCOinCXX: " + DCOinCXX);
    console.log("DCOinXAU: " + DCOinXAU);
    console.log("nextCXXinXAU: " + nextCXXinXAU);

    const newCXXrates = _.mapValues(
      denomsInXAU,
      (value) => 1 / nextCXXinXAU / value
    );
    newCXXrates.CXX = 1;
    console.log("newCXXrates:");
    console.log(newCXXrates);

    console.log("Creating new daynode");
    await ledgerSpaceSession.run(
      `
      MATCH (expiringDayNode:DayNode {Active: TRUE})
      CREATE (expiringDayNode)-[:NEXT_DAY]->(nextDayNode:DayNode)
      SET expiringDayNode.Active = false,
          expiringDayNode.DCOrunningNow = false,
          nextDayNode = $newCXXrates,
          nextDayNode.CXXprior_CXXcurrent = $CXXprior_CXXcurrent,
          nextDayNode.Date = date($nextDate),
          nextDayNode.Active = true,
          nextDayNode.DCOrunningNow = true
    `,
      { newCXXrates, nextDate, CXXprior_CXXcurrent }
    );

    console.log("Creating DCO give transactions");
    const foundationID = (
      await ledgerSpaceSession.run(`
      MATCH (credexFoundation:Member {memberType: "CREDEX_FOUNDATION"})
      RETURN credexFoundation.memberID AS foundationID
    `)
    ).records[0].get("foundationID");

    for (const confirmedParticipant of confirmedParticipants) {
      const dataForDCOgive: Credex = {
        issuerMemberID: confirmedParticipant.get("memberID"),
        receiverMemberID: foundationID,
        Denomination: confirmedParticipant.get("DCOdenom"),
        InitialAmount: confirmedParticipant.get("DCOgiveInDenom"),
        credexType: "DCO_GIVE",
        securedCredex: true,
      };
      const DCOgiveCredex = await OfferCredexService(dataForDCOgive);
      if (typeof DCOgiveCredex.credex == "boolean") {
        throw new Error("Invalid response from OfferCredexService");
      }
      if (
        DCOgiveCredex.credex &&
        typeof DCOgiveCredex.credex.credexID === "string"
      ) {
        await AcceptCredexService(DCOgiveCredex.credex.credexID);
      } else {
        throw new Error("Invalid credexID from OfferCredexService");
      }
    }

    console.log("Updating credex and asset balances");
    await ledgerSpaceSession.run(`
      MATCH (newDayNode:DayNode {Active: TRUE})

      // Update balances on CXX credexes
      MATCH (credcoinCredex:Credex)
      WHERE credcoinCredex.Denomination = "CXX"
      SET 
        credcoinCredex.InitialAmount =
          credcoinCredex.InitialAmount
          / newDayNode.CXXprior_CXXcurrent,
        credcoinCredex.OutstandingAmount =
          credcoinCredex.OutstandingAmount
          / newDayNode.CXXprior_CXXcurrent,
        credcoinCredex.RedeemedAmount =
          credcoinCredex.RedeemedAmount
          / newDayNode.CXXprior_CXXcurrent,
        credcoinCredex.DefaultedAmount =
          credcoinCredex.DefaultedAmount
          / newDayNode.CXXprior_CXXcurrent,
        credcoinCredex.WrittenOffAmount =
          credcoinCredex.WrittenOffAmount
          / newDayNode.CXXprior_CXXcurrent

      // Update balances on currency credexes
      WITH newDayNode
      MATCH (currencyCredex:Credex)
      WHERE currencyCredex.Denomination <> "CXX"
      SET
        currencyCredex.InitialAmount =
          (currencyCredex.InitialAmount / currencyCredex.CXXmultiplier)
          * newDayNode[currencyCredex.Denomination],
        currencyCredex.OutstandingAmount =
          (currencyCredex.OutstandingAmount / currencyCredex.CXXmultiplier)
          * newDayNode[currencyCredex.Denomination],
        currencyCredex.RedeemedAmount =
          (currencyCredex.RedeemedAmount / currencyCredex.CXXmultiplier)
          * newDayNode[currencyCredex.Denomination],
        currencyCredex.DefaultedAmount =
          (currencyCredex.DefaultedAmount / currencyCredex.CXXmultiplier)
          * newDayNode[currencyCredex.Denomination],
        currencyCredex.WrittenOffAmount =
          (currencyCredex.WrittenOffAmount / currencyCredex.CXXmultiplier)
          * newDayNode[currencyCredex.Denomination],
        currencyCredex.CXXmultiplier = newDayNode[currencyCredex.Denomination]

      // Update balances on CXX :REDEEMED relationships
      WITH newDayNode
      MATCH ()-[CXXredeemed:REDEEMED]-()
      WHERE CXXredeemed.Denomination = "CXX"
      SET
        CXXredeemed.AmountRedeemed =
          CXXredeemed.AmountRedeemed
          / newDayNode.CXXprior_CXXcurrent,
        CXXredeemed.AmountOutstandingNow =
          CXXredeemed.AmountOutstandingNow
          / newDayNode.CXXprior_CXXcurrent

      // Update balances on currency :REDEEMED relationships
      WITH newDayNode
      MATCH ()-[currencyRedeemed:REDEEMED]-()
      WHERE currencyRedeemed.Denomination <> "CXX"
      SET
        currencyRedeemed.AmountOutstandingNow =
          (currencyRedeemed.AmountOutstandingNow / currencyRedeemed.CXXmultiplier)
          * newDayNode[currencyRedeemed.Denomination],
        currencyRedeemed.AmountRedeemed =
          (currencyRedeemed.AmountRedeemed / currencyRedeemed.CXXmultiplier)
          * newDayNode[currencyRedeemed.Denomination],
        currencyRedeemed.CXXmultiplier = newDayNode[currencyRedeemed.Denomination]

      // Update balances on CXX :CREDLOOP relationships
      WITH newDayNode
      MATCH ()-[CXXcredloop:CREDLOOP]-()
      WHERE CXXcredloop.Denomination = "CXX"
      SET
        CXXcredloop.AmountRedeemed =
          CXXcredloop.AmountRedeemed
          / newDayNode.CXXprior_CXXcurrent,
        CXXcredloop.AmountOutstandingNow =
          CXXcredloop.AmountOutstandingNow
          / newDayNode.CXXprior_CXXcurrent

      // Update balances on currency :CREDLOOP relationships
      WITH newDayNode
      MATCH ()-[currencyCredloop:CREDLOOP]-()
      WHERE currencyCredloop.Denomination <> "CXX"
      SET
        currencyCredloop.AmountOutstandingNow =
          (currencyCredloop.AmountOutstandingNow / currencyCredloop.CXXmultiplier)
          * newDayNode[currencyCredloop.Denomination],
        currencyCredloop.AmountRedeemed =
          (currencyCredloop.AmountRedeemed / currencyCredloop.CXXmultiplier)
          * newDayNode[currencyCredloop.Denomination],
        currencyCredloop.CXXmultiplier = newDayNode[currencyCredloop.Denomination]

      // Update balances on loop anchors (always CXX)
      WITH newDayNode
      MATCH (loopAnchors:LoopAnchor)
      SET
        loopAnchors.LoopedAmount =
          loopAnchors.LoopedAmount
          / newDayNode.CXXprior_CXXcurrent
    `);

    //update balances in searchSpace credexes
    await searchSpaceSession.run(
      `
      MATCH (issuer:Member)-[credex:Credex]->(receiver:Member)
      SET
        credex.outstandingAmount =
          credex.outstandingAmount
          / $CXXprior_CXXcurrent
    `,
      { CXXprior_CXXcurrent }
    );

    console.log("Creating DCO receive transactions");
    for (const confirmedParticipant of confirmedParticipants) {
      const dataForDCOreceive: Credex = {
        issuerMemberID: foundationID,
        receiverMemberID: confirmedParticipant.get("memberID"),
        Denomination: "CXX",
        InitialAmount: 1,
        credexType: "DCO_RECEIVE",
        securedCredex: true,
      };
      const DCOreceiveCredex = await OfferCredexService(dataForDCOreceive);
      if (typeof DCOreceiveCredex.credex == "boolean") {
        throw new Error("Invalid response from OfferCredexService");
      }
      if (
        DCOreceiveCredex.credex &&
        typeof DCOreceiveCredex.credex.credexID === "string"
      ) {
        await AcceptCredexService(DCOreceiveCredex.credex.credexID);
      } else {
        throw new Error("Invalid credexID from OfferCredexService");
      }
    }

    console.log("Turning off DCOrunningNow flag");
    await ledgerSpaceSession.run(`
      MATCH (daynode:DayNode {Active: TRUE})
      SET daynode.DCOrunningNow = false
    `);

    console.log(`DCOexecute done to open ${nextDate}`);
  } catch (error) {
    console.error("Error during DCOexecute:", error);
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
  }

  return true;
}
