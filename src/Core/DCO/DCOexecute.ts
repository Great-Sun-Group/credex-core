import axios from "axios";
import _ from "lodash";
import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import { getDenominations, Denomination } from "../constants/denominations";
import { GetSecuredAuthorizationService } from "../../Credex/services/GetSecuredAuthorization";
import { OfferCredexService } from "../../Credex/services/OfferCredex";
import { AcceptCredexService } from "../../Credex/services/AcceptCredex";
import { fetchZigRate } from "./fetchZigRate";
import { createNeo4jBackup } from "./DBbackup";
import logger from "../../../config/logger";

interface Rates {
  [key: string]: number;
}

interface Participant {
  accountID: string;
  DCOmemberID: string;
  DCOgiveInCXX: number;
  DCOgiveInDenom: number;
  DCOdenom: string;
}

/**
 * Executes the Daily Credcoin Offering (DCO) process.
 * This function handles the daily operations of the Credcoin system,
 * including rate updates, participant validation, and transaction processing.
 */
export async function DCOexecute(): Promise<boolean> {
  console.log("Starting DCOexecute");
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  try {
    await waitForMTQCompletion(ledgerSpaceSession);
    const { previousDate, nextDate } = await setDCORunningFlag(
      ledgerSpaceSession
    );

    await createNeo4jBackup(previousDate, "_end");
    await handleDefaultingCredexes(ledgerSpaceSession);
    await expirePendingOffers(ledgerSpaceSession);

    const USDbaseRates = await fetchCurrencyRates(nextDate);
    const {
      newCXXrates,
      CXXprior_CXXcurrent,
      DCOinCXX,
      DCOinXAU,
      numberConfirmedParticipants,
    } = await processDCOParticipants(ledgerSpaceSession, USDbaseRates);

    await createNewDaynode(
      ledgerSpaceSession,
      newCXXrates,
      nextDate,
      CXXprior_CXXcurrent
    );
    await updateCredexBalances(
      ledgerSpaceSession,
      searchSpaceSession,
      newCXXrates,
      CXXprior_CXXcurrent
    );

    const { foundationID, foundationXOid } = await getFoundationData(
      ledgerSpaceSession
    );
    await processDCOTransactions(
      ledgerSpaceSession,
      foundationID,
      foundationXOid,
      DCOinCXX,
      numberConfirmedParticipants
    );

    await createNeo4jBackup(nextDate, "_start");
    console.log(`DCOexecute completed for ${nextDate}`);

    return true;
  } catch (error) {
    logger.error("Error during DCOexecute", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
  }
}

async function waitForMTQCompletion(session: any): Promise<void> {
  console.log("Waiting for MTQ completion");
  let MTQflag = true;
  while (MTQflag) {
    const result = await session.run(`
      MATCH (daynode:Daynode {Active: true})
      RETURN daynode.MTQrunningNow AS MTQflag
    `);
    MTQflag = result.records[0]?.get("MTQflag");
    if (MTQflag) {
      console.log("MTQ running. Waiting 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  console.log("MTQ not running. Proceeding...");
}

async function setDCORunningFlag(
  session: any
): Promise<{ previousDate: string; nextDate: string }> {
  console.log("Setting DCOrunningNow flag");
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: TRUE})
    SET daynode.DCOrunningNow = true
    RETURN
      daynode.Date AS previousDate,
      daynode.Date + Duration({days: 1}) AS nextDate
  `);
  const previousDate = result.records[0].get("previousDate");
  const nextDate = result.records[0].get("nextDate");
  console.log(`Expiring day: ${previousDate}`);
  return { previousDate, nextDate };
}

async function handleDefaultingCredexes(session: any): Promise<void> {
  console.log("Processing defaulting unsecured credexes");
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: TRUE})
    OPTIONAL MATCH (account1:Account)-[rel1:OWES]->(defaulting:Credex)-[rel2:OWES]->(account2:Account)
    WHERE defaulting.dueDate <= daynode.Date AND defaulting.DefaultedAmount <= 0
    SET defaulting.DefaultedAmount = defaulting.OutstandingAmount
    WITH defaulting, daynode
    UNWIND defaulting AS defaultingCredex
    CREATE (defaultingCredex)-[:DEFAULTED_ON]->(daynode)
    RETURN count(defaulting) AS numberDefaulted
  `);
  const numberDefaulted = result.records[0]?.get("numberDefaulted") || 0;
  console.log(`Defaults: ${numberDefaulted}`);
}

async function expirePendingOffers(session: any): Promise<void> {
  console.log("Expiring pending offers/requests");
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: TRUE})
    OPTIONAL MATCH (:Account)-[rel1:OFFERS|REQUESTS]->(expiringPending:Credex)-[rel2:OFFERS|REQUESTS]->(:Account),
    (expiringPending)-[:CREATED_ON]->(createdDaynode:Daynode)
    WHERE createdDaynode.Date + Duration({days: 1}) < daynode.Date
    DELETE rel1, rel2
    RETURN count(expiringPending) AS numberExpiringPending
  `);
  const numberExpiringPending =
    result.records[0]?.get("numberExpiringPending") || 0;
  console.log(`Expired pending offers/requests: ${numberExpiringPending}`);
}

async function fetchCurrencyRates(nextDate: string): Promise<Rates> {
  console.log("Fetching currency rates");
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

  const ZIGrates = await fetchZigRate();
  USDbaseRates.ZIG = ZIGrates.length > 0 ? parseFloat(ZIGrates[1].avg) : NaN;

  validateRates(USDbaseRates);
  return USDbaseRates;
}

function validateRates(rates: Rates): void {
  const allDenoms = getDenominations({}) as Denomination[];
  const denomsToCheck = allDenoms.filter(
    (denom: Denomination) => denom.code !== "CXX"
  );

  const allValid = denomsToCheck.every(
    (denom: Denomination) =>
      rates.hasOwnProperty(denom.code) &&
      typeof rates[denom.code] === "number" &&
      !isNaN(rates[denom.code])
  );

  if (!allValid) {
    throw new Error("Invalid or missing currency rates");
  }
}

async function processDCOParticipants(
  session: any,
  USDbaseRates: Rates
): Promise<any> {
  console.log("Processing DCO participants");
  const denomsInXAU = _.mapValues(
    USDbaseRates,
    (value) => value / USDbaseRates.XAU
  );

  const result = await session.run(`
    MATCH (daynode:Daynode{Active:true})
    MATCH (DCOparticpantsDeclared:Account)<-[:OWNS]-(DCOmember:Member)
    WHERE DCOparticpantsDeclared.DCOgiveInCXX > 0
    RETURN
      DCOparticpantsDeclared.accountID AS accountID,
      DCOmember.memberID AS DCOmemberID,
      DCOparticpantsDeclared.DCOgiveInCXX AS DCOgiveInCXX,
      DCOparticpantsDeclared.DCOgiveInCXX / daynode[DCOparticpantsDeclared.DCOdenom] AS DCOgiveInDenom,
      DCOparticpantsDeclared.DCOdenom AS DCOdenom
  `);

  const declaredParticipants = result.records;
  console.log(`Declared participants: ${declaredParticipants.length}`);

  let DCOinCXX = 0;
  let DCOinXAU = 0;
  const confirmedParticipants: Participant[] = [];

  for (const participant of declaredParticipants) {
    const { accountID, DCOmemberID, DCOdenom, DCOgiveInCXX, DCOgiveInDenom } =
      participant.toObject();
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

  console.log(`Confirmed participants: ${numberConfirmedParticipants}`);
  console.log(`DCO in CXX: ${DCOinCXX}`);
  console.log(`DCO in XAU: ${DCOinXAU}`);
  console.log(`Next CXX in XAU: ${nextCXXinXAU}`);

  const newCXXrates = _.mapValues(
    denomsInXAU,
    (value) => 1 / nextCXXinXAU / value
  );
  newCXXrates.CXX = 1;

  logger.info("DCO Rates", {
    USDinXAU: denomsInXAU.XAU,
    CXXinXAU: newCXXrates.CXX,
    CXXprior_CXXcurrent,
  });

  return {
    newCXXrates,
    CXXprior_CXXcurrent,
    DCOinCXX,
    DCOinXAU,
    numberConfirmedParticipants,
    confirmedParticipants,
  };
}

async function createNewDaynode(
  session: any,
  newCXXrates: Rates,
  nextDate: string,
  CXXprior_CXXcurrent: number
): Promise<void> {
  console.log("Creating new daynode");
  await session.run(
    `
    MATCH (expiringDaynode:Daynode {Active: TRUE})
    CREATE (expiringDaynode)-[:NEXT_DAY]->(nextDaynode:Daynode)
    SET expiringDaynode.Active = false,
        expiringDaynode.DCOrunningNow = false,
        nextDaynode = $newCXXrates,
        nextDaynode.CXXprior_CXXcurrent = $CXXprior_CXXcurrent,
        nextDaynode.Date = date($nextDate),
        nextDaynode.Active = true,
        nextDaynode.DCOrunningNow = true
  `,
    { newCXXrates, nextDate, CXXprior_CXXcurrent }
  );
}

async function updateCredexBalances(
  ledgerSession: any,
  searchSession: any,
  newCXXrates: Rates,
  CXXprior_CXXcurrent: number
): Promise<void> {
  console.log("Updating credex and asset balances");

  // Update ledger space
  await ledgerSession.run(`
    MATCH (newDaynode:Daynode {Active: TRUE})

    // Update CXX credexes
    MATCH (credcoinCredex:Credex)
    WHERE credcoinCredex.Denomination = "CXX"
    SET 
      credcoinCredex.InitialAmount = credcoinCredex.InitialAmount / newDaynode.CXXprior_CXXcurrent,
      credcoinCredex.OutstandingAmount = credcoinCredex.OutstandingAmount / newDaynode.CXXprior_CXXcurrent,
      credcoinCredex.RedeemedAmount = credcoinCredex.RedeemedAmount / newDaynode.CXXprior_CXXcurrent,
      credcoinCredex.DefaultedAmount = credcoinCredex.DefaultedAmount / newDaynode.CXXprior_CXXcurrent,
      credcoinCredex.WrittenOffAmount = credcoinCredex.WrittenOffAmount / newDaynode.CXXprior_CXXcurrent

    // Update currency credexes
    MATCH (currencyCredex:Credex)
    WHERE currencyCredex.Denomination <> "CXX"
    SET
      currencyCredex.InitialAmount = (currencyCredex.InitialAmount / currencyCredex.CXXmultiplier) * newDaynode[currencyCredex.Denomination],
      currencyCredex.OutstandingAmount = (currencyCredex.OutstandingAmount / currencyCredex.CXXmultiplier) * newDaynode[currencyCredex.Denomination],
      currencyCredex.RedeemedAmount = (currencyCredex.RedeemedAmount / currencyCredex.CXXmultiplier) * newDaynode[currencyCredex.Denomination],
      currencyCredex.DefaultedAmount = (currencyCredex.DefaultedAmount / currencyCredex.CXXmultiplier) * newDaynode[currencyCredex.Denomination],
      currencyCredex.WrittenOffAmount = (currencyCredex.WrittenOffAmount / currencyCredex.CXXmultiplier) * newDaynode[currencyCredex.Denomination],
      currencyCredex.CXXmultiplier = newDaynode[currencyCredex.Denomination]

    // Update CXX :REDEEMED relationships
    MATCH ()-[CXXredeemed:REDEEMED]-()
    WHERE CXXredeemed.Denomination = "CXX"
    SET
      CXXredeemed.AmountRedeemed = CXXredeemed.AmountRedeemed / newDaynode.CXXprior_CXXcurrent,
      CXXredeemed.AmountOutstandingNow = CXXredeemed.AmountOutstandingNow / newDaynode.CXXprior_CXXcurrent

    // Update currency :REDEEMED relationships
    MATCH ()-[currencyRedeemed:REDEEMED]-()
    WHERE currencyRedeemed.Denomination <> "CXX"
    SET
      currencyRedeemed.AmountOutstandingNow = (currencyRedeemed.AmountOutstandingNow / currencyRedeemed.CXXmultiplier) * newDaynode[currencyRedeemed.Denomination],
      currencyRedeemed.AmountRedeemed = (currencyRedeemed.AmountRedeemed / currencyRedeemed.CXXmultiplier) * newDaynode[currencyRedeemed.Denomination],
      currencyRedeemed.CXXmultiplier = newDaynode[currencyRedeemed.Denomination]

    // Update CXX :CREDLOOP relationships
    MATCH ()-[CXXcredloop:CREDLOOP]-()
    WHERE CXXcredloop.Denomination = "CXX"
    SET
      CXXcredloop.AmountRedeemed = CXXcredloop.AmountRedeemed / newDaynode.CXXprior_CXXcurrent,
      CXXcredloop.AmountOutstandingNow = CXXcredloop.AmountOutstandingNow / newDaynode.CXXprior_CXXcurrent

    // Update currency :CREDLOOP relationships
    MATCH ()-[currencyCredloop:CREDLOOP]-()
    WHERE currencyCredloop.Denomination <> "CXX"
    SET
      currencyCredloop.AmountOutstandingNow = (currencyCredloop.AmountOutstandingNow / currencyCredloop.CXXmultiplier) * newDaynode[currencyCredloop.Denomination],
      currencyCredloop.AmountRedeemed = (currencyCredloop.AmountRedeemed / currencyCredloop.CXXmultiplier) * newDaynode[currencyCredloop.Denomination],
      currencyCredloop.CXXmultiplier = newDaynode[currencyCredloop.Denomination]

    // Update loop anchors (always CXX)
    MATCH (loopAnchors:LoopAnchor)
    SET
      loopAnchors.LoopedAmount = loopAnchors.LoopedAmount / newDaynode.CXXprior_CXXcurrent
  `);

  // Update search space
  await searchSession.run(
    `
    MATCH (credex:Credex)
    WHERE credex.Denomination = "CXX"
    SET credex.outstandingAmount = credex.outstandingAmount / $CXXprior_CXXcurrent
  `,
    { CXXprior_CXXcurrent }
  );

  await searchSession.run(
    `
    MATCH (credex:Credex)
    WHERE credex.Denomination <> "CXX"
    WITH credex, $newCXXrates AS rates
    SET credex.outstandingAmount = (credex.outstandingAmount / credex.CXXmultiplier) * coalesce(rates[credex.Denomination], 1),
        credex.CXXmultiplier = coalesce(rates[credex.Denomination], 1)
  `,
    { newCXXrates }
  );
}

async function getFoundationData(
  session: any
): Promise<{ foundationID: string; foundationXOid: string }> {
  const result = await session.run(`
    MATCH (credexFoundation:Account {accountType: "CREDEX_FOUNDATION"})<-[:OWNS]-(foundationXO:Member)
    RETURN credexFoundation.accountID AS foundationID, foundationXO.memberID AS foundationXOid
  `);
  return {
    foundationID: result.records[0].get("foundationID"),
    foundationXOid: result.records[0].get("foundationXOid"),
  };
}

async function processDCOTransactions(
  session: any,
  foundationID: string,
  foundationXOid: string,
  DCOinCXX: number,
  numberConfirmedParticipants: number
): Promise<void> {
  console.log("Processing DCO transactions");

  const confirmedParticipants: Participant[] = (
    await session.run(`
    MATCH (daynode:Daynode{Active:true})
    MATCH (DCOparticpantsDeclared:Account)<-[:OWNS]-(DCOmember:Member)
    WHERE DCOparticpantsDeclared.DCOgiveInCXX > 0
    RETURN
      DCOparticpantsDeclared.accountID AS accountID,
      DCOmember.memberID AS DCOmemberID,
      DCOparticpantsDeclared.DCOgiveInCXX AS DCOgiveInCXX,
      DCOparticpantsDeclared.DCOgiveInCXX / daynode[DCOparticpantsDeclared.DCOdenom] AS DCOgiveInDenom,
      DCOparticpantsDeclared.DCOdenom AS DCOdenom
  `)
  ).records.map((record: any) => record.toObject() as Participant);

  // Process DCO give transactions
  await Promise.all(
    confirmedParticipants.map(async (participant: Participant) => {
      const dataForDCOgive = {
        memberID: participant.DCOmemberID,
        issuerAccountID: participant.accountID,
        receiverAccountID: foundationID,
        Denomination: participant.DCOdenom,
        InitialAmount: participant.DCOgiveInDenom,
        credexType: "DCO_GIVE",
        securedCredex: true,
      };

      const DCOgiveCredex = await OfferCredexService(dataForDCOgive);
      if (
        typeof DCOgiveCredex.credex === "boolean" ||
        !DCOgiveCredex.credex?.credexID
      ) {
        throw new Error(
          "Invalid response from OfferCredexService for DCO give"
        );
      }
      await AcceptCredexService(DCOgiveCredex.credex.credexID, foundationXOid);
    })
  );

  // Process DCO receive transactions
  await Promise.all(
    confirmedParticipants.map(async (participant: Participant) => {
      const dataForDCOreceive = {
        memberID: foundationXOid,
        issuerAccountID: foundationID,
        receiverAccountID: participant.accountID,
        Denomination: "CXX",
        InitialAmount: DCOinCXX / numberConfirmedParticipants,
        credexType: "DCO_RECEIVE",
        securedCredex: true,
      };

      const DCOreceiveCredex = await OfferCredexService(dataForDCOreceive);
      if (
        typeof DCOreceiveCredex.credex === "boolean" ||
        !DCOreceiveCredex.credex?.credexID
      ) {
        throw new Error(
          "Invalid response from OfferCredexService for DCO receive"
        );
      }
      await AcceptCredexService(
        DCOreceiveCredex.credex.credexID,
        foundationXOid
      );
    })
  );
}
