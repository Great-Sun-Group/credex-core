"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DCOexecute = DCOexecute;
const axios_1 = __importDefault(require("axios"));
const lodash_1 = __importDefault(require("lodash"));
const neo4j_1 = require("../../../config/neo4j");
const denominations_1 = require("../../constants/denominations");
const GetSecuredAuthorization_1 = require("../../api/Credex/services/GetSecuredAuthorization");
const OfferCredex_1 = require("../../api/Credex/services/OfferCredex");
const AcceptCredex_1 = require("../../api/Credex/services/AcceptCredex");
const fetchZigRate_1 = require("./fetchZigRate");
const DBbackup_1 = require("./DBbackup");
const logger_1 = require("../../utils/logger");
const validators_1 = require("../../utils/validators");
/**
 * Executes the Daily Credcoin Offering (DCO) process.
 * This function handles the daily operations of the Credcoin system,
 * including rate updates, participant validation, and transaction processing.
 */
async function DCOexecute() {
    (0, logger_1.logInfo)("Starting DCOexecute");
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    const searchSpaceSession = neo4j_1.searchSpaceDriver.session();
    try {
        await waitForMTQCompletion(ledgerSpaceSession);
        const { previousDate, nextDate } = await setDCORunningFlag(ledgerSpaceSession);
        await (0, DBbackup_1.createNeo4jBackup)(previousDate, "_end");
        await handleDefaultingCredexes(ledgerSpaceSession);
        await expirePendingOffers(ledgerSpaceSession);
        const USDbaseRates = await fetchCurrencyRates(nextDate);
        const { newCXXrates, CXXprior_CXXcurrent, DCOinCXX, DCOinXAU, numberConfirmedParticipants, } = await processDCOParticipants(ledgerSpaceSession, USDbaseRates);
        await createNewDaynode(ledgerSpaceSession, newCXXrates, nextDate, CXXprior_CXXcurrent);
        await updateCredexBalances(ledgerSpaceSession, searchSpaceSession, newCXXrates, CXXprior_CXXcurrent);
        const { foundationID, foundationXOid } = await getFoundationData(ledgerSpaceSession);
        await processDCOTransactions(ledgerSpaceSession, foundationID, foundationXOid, DCOinCXX, numberConfirmedParticipants);
        await (0, DBbackup_1.createNeo4jBackup)(nextDate, "_start");
        (0, logger_1.logInfo)(`DCOexecute completed for ${nextDate}`);
        return true;
    }
    catch (error) {
        (0, logger_1.logError)("Error during DCOexecute", error);
        return false;
    }
    finally {
        await ledgerSpaceSession.close();
        await searchSpaceSession.close();
    }
}
async function waitForMTQCompletion(session) {
    (0, logger_1.logInfo)("Waiting for MTQ completion");
    let MTQflag = true;
    while (MTQflag) {
        const result = await session.run(`
      MATCH (daynode:Daynode {Active: true})
      RETURN daynode.MTQrunningNow AS MTQflag
    `);
        MTQflag = result.records[0]?.get("MTQflag");
        if (MTQflag) {
            (0, logger_1.logDebug)("MTQ running. Waiting 5 seconds...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
    (0, logger_1.logInfo)("MTQ not running. Proceeding...");
}
async function setDCORunningFlag(session) {
    (0, logger_1.logInfo)("Setting DCOrunningNow flag");
    const result = await session.run(`
    MATCH (daynode:Daynode {Active: TRUE})
    SET daynode.DCOrunningNow = true
    RETURN
      daynode.Date AS previousDate,
      daynode.Date + Duration({days: 1}) AS nextDate
  `);
    const previousDate = result.records[0].get("previousDate");
    const nextDate = result.records[0].get("nextDate");
    (0, logger_1.logInfo)(`Expiring day: ${previousDate}`);
    return { previousDate, nextDate };
}
async function handleDefaultingCredexes(session) {
    (0, logger_1.logInfo)("Processing defaulting unsecured credexes");
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
    (0, logger_1.logInfo)(`Defaults: ${numberDefaulted}`);
}
async function expirePendingOffers(session) {
    (0, logger_1.logInfo)("Expiring pending offers/requests");
    const result = await session.run(`
    MATCH (daynode:Daynode {Active: TRUE})
    OPTIONAL MATCH (:Account)-[rel1:OFFERS|REQUESTS]->(expiringPending:Credex)-[rel2:OFFERS|REQUESTS]->(:Account),
    (expiringPending)-[:CREATED_ON]->(createdDaynode:Daynode)
    WHERE createdDaynode.Date + Duration({days: 1}) < daynode.Date
    DELETE rel1, rel2
    RETURN count(expiringPending) AS numberExpiringPending
  `);
    const numberExpiringPending = result.records[0]?.get("numberExpiringPending") || 0;
    (0, logger_1.logInfo)(`Expired pending offers/requests: ${numberExpiringPending}`);
}
async function fetchCurrencyRates(nextDate) {
    (0, logger_1.logInfo)("Fetching currency rates");
    const symbols = (0, denominations_1.getDenominations)({
        sourceForRate: "OpenExchangeRates",
        formatAsList: true,
    });
    const { data: { rates: USDbaseRates }, } = await axios_1.default.get(`https://openexchangerates.org/api/historical/${nextDate}.json`, { params: { app_id: process.env.OPEN_EXCHANGE_RATES_API, symbols } });
    const ZIGrates = await (0, fetchZigRate_1.fetchZigRate)();
    USDbaseRates.ZIG = ZIGrates.length > 0 ? parseFloat(ZIGrates[1].avg) : NaN;
    validateRates(USDbaseRates);
    return USDbaseRates;
}
function validateRates(rates) {
    const allDenoms = (0, denominations_1.getDenominations)({});
    const denomsToCheck = allDenoms.filter((denom) => denom.code !== "CXX");
    const allValid = denomsToCheck.every((denom) => rates.hasOwnProperty(denom.code) &&
        (0, validators_1.validateDenomination)(denom.code) &&
        (0, validators_1.validateAmount)(rates[denom.code]));
    if (!allValid) {
        throw new Error("Invalid or missing currency rates");
    }
}
async function processDCOParticipants(session, USDbaseRates) {
    (0, logger_1.logInfo)("Processing DCO participants");
    const denomsInXAU = lodash_1.default.mapValues(USDbaseRates, (value) => value / USDbaseRates.XAU);
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
    (0, logger_1.logInfo)(`Declared participants: ${declaredParticipants.length}`);
    let DCOinCXX = 0;
    let DCOinXAU = 0;
    const confirmedParticipants = [];
    for (const participant of declaredParticipants) {
        const { accountID, DCOmemberID, DCOdenom, DCOgiveInCXX, DCOgiveInDenom } = participant.toObject();
        if (!(0, validators_1.validateDenomination)(DCOdenom) || !(0, validators_1.validateAmount)(DCOgiveInCXX) || !(0, validators_1.validateAmount)(DCOgiveInDenom)) {
            (0, logger_1.logWarning)("Invalid participant data", { accountID, DCOmemberID, DCOdenom, DCOgiveInCXX, DCOgiveInDenom });
            continue;
        }
        const { securableAmountInDenom } = await (0, GetSecuredAuthorization_1.GetSecuredAuthorizationService)(accountID, DCOdenom);
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
    (0, logger_1.logInfo)(`Confirmed participants: ${numberConfirmedParticipants}`);
    (0, logger_1.logInfo)(`DCO in CXX: ${DCOinCXX}`);
    (0, logger_1.logInfo)(`DCO in XAU: ${DCOinXAU}`);
    (0, logger_1.logInfo)(`Next CXX in XAU: ${nextCXXinXAU}`);
    const newCXXrates = lodash_1.default.mapValues(denomsInXAU, (value) => 1 / nextCXXinXAU / value);
    newCXXrates.CXX = 1;
    (0, logger_1.logDCORates)(denomsInXAU.XAU, newCXXrates.CXX, CXXprior_CXXcurrent);
    return {
        newCXXrates,
        CXXprior_CXXcurrent,
        DCOinCXX,
        DCOinXAU,
        numberConfirmedParticipants,
        confirmedParticipants,
    };
}
async function createNewDaynode(session, newCXXrates, nextDate, CXXprior_CXXcurrent) {
    (0, logger_1.logInfo)("Creating new daynode");
    await session.run(`
    MATCH (expiringDaynode:Daynode {Active: TRUE})
    CREATE (expiringDaynode)-[:NEXT_DAY]->(nextDaynode:Daynode)
    SET expiringDaynode.Active = false,
        expiringDaynode.DCOrunningNow = false,
        nextDaynode = $newCXXrates,
        nextDaynode.CXXprior_CXXcurrent = $CXXprior_CXXcurrent,
        nextDaynode.Date = date($nextDate),
        nextDaynode.Active = true,
        nextDaynode.DCOrunningNow = true
  `, { newCXXrates, nextDate, CXXprior_CXXcurrent });
}
async function updateCredexBalances(ledgerSession, searchSession, newCXXrates, CXXprior_CXXcurrent) {
    (0, logger_1.logInfo)("Updating credex and asset balances");
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
    await searchSession.run(`
    MATCH (credex:Credex)
    WHERE credex.Denomination = "CXX"
    SET credex.outstandingAmount = credex.outstandingAmount / $CXXprior_CXXcurrent
  `, { CXXprior_CXXcurrent });
    await searchSession.run(`
    MATCH (credex:Credex)
    WHERE credex.Denomination <> "CXX"
    WITH credex, $newCXXrates AS rates
    SET credex.outstandingAmount = (credex.outstandingAmount / credex.CXXmultiplier) * coalesce(rates[credex.Denomination], 1),
        credex.CXXmultiplier = coalesce(rates[credex.Denomination], 1)
  `, { newCXXrates });
}
async function getFoundationData(session) {
    const result = await session.run(`
    MATCH (credexFoundation:Account {accountType: "CREDEX_FOUNDATION"})<-[:OWNS]-(foundationXO:Member)
    RETURN credexFoundation.accountID AS foundationID, foundationXO.memberID AS foundationXOid
  `);
    return {
        foundationID: result.records[0].get("foundationID"),
        foundationXOid: result.records[0].get("foundationXOid"),
    };
}
async function processDCOTransactions(session, foundationID, foundationXOid, DCOinCXX, numberConfirmedParticipants) {
    (0, logger_1.logInfo)("Processing DCO transactions");
    const confirmedParticipants = (await session.run(`
    MATCH (daynode:Daynode{Active:true})
    MATCH (DCOparticpantsDeclared:Account)<-[:OWNS]-(DCOmember:Member)
    WHERE DCOparticpantsDeclared.DCOgiveInCXX > 0
    RETURN
      DCOparticpantsDeclared.accountID AS accountID,
      DCOmember.memberID AS DCOmemberID,
      DCOparticpantsDeclared.DCOgiveInCXX AS DCOgiveInCXX,
      DCOparticpantsDeclared.DCOgiveInCXX / daynode[DCOparticpantsDeclared.DCOdenom] AS DCOgiveInDenom,
      DCOparticpantsDeclared.DCOdenom AS DCOdenom
  `)).records.map((record) => record.toObject());
    // Process DCO give transactions
    await Promise.all(confirmedParticipants.map(async (participant) => {
        if (!(0, validators_1.validateDenomination)(participant.DCOdenom) || !(0, validators_1.validateAmount)(participant.DCOgiveInDenom)) {
            (0, logger_1.logWarning)("Invalid participant data for DCO give", participant);
            return;
        }
        const dataForDCOgive = {
            memberID: participant.DCOmemberID,
            issuerAccountID: participant.accountID,
            receiverAccountID: foundationID,
            Denomination: participant.DCOdenom,
            InitialAmount: participant.DCOgiveInDenom,
            credexType: "DCO_GIVE",
            securedCredex: true,
        };
        const DCOgiveCredex = await (0, OfferCredex_1.OfferCredexService)(dataForDCOgive);
        if (typeof DCOgiveCredex.credex === "boolean" ||
            !DCOgiveCredex.credex?.credexID) {
            throw new Error("Invalid response from OfferCredexService for DCO give");
        }
        await (0, AcceptCredex_1.AcceptCredexService)(DCOgiveCredex.credex.credexID, foundationXOid);
    }));
    // Process DCO receive transactions
    await Promise.all(confirmedParticipants.map(async (participant) => {
        const receiveAmount = DCOinCXX / numberConfirmedParticipants;
        if (!(0, validators_1.validateAmount)(receiveAmount)) {
            (0, logger_1.logWarning)("Invalid receive amount for DCO receive", { receiveAmount, participant });
            return;
        }
        const dataForDCOreceive = {
            memberID: foundationXOid,
            issuerAccountID: foundationID,
            receiverAccountID: participant.accountID,
            Denomination: "CXX",
            InitialAmount: receiveAmount,
            credexType: "DCO_RECEIVE",
            securedCredex: true,
        };
        const DCOreceiveCredex = await (0, OfferCredex_1.OfferCredexService)(dataForDCOreceive);
        if (typeof DCOreceiveCredex.credex === "boolean" ||
            !DCOreceiveCredex.credex?.credexID) {
            throw new Error("Invalid response from OfferCredexService for DCO receive");
        }
        await (0, AcceptCredex_1.AcceptCredexService)(DCOreceiveCredex.credex.credexID, foundationXOid);
    }));
}
//# sourceMappingURL=DCOexecute.js.map