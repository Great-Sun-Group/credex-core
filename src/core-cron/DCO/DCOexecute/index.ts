import { v4 as uuidv4 } from "uuid";
import { ledgerSpaceDriver, searchSpaceDriver } from "../../../../config/neo4j";
import { logInfo, logError } from "../../../utils/logger";
import { calculateSystemChecksum } from "./checksum";
import {
  waitForMTQCompletion,
  setDCORunningFlag,
  resetDCORunningFlag,
  handleDefaultingCredexes,
  expirePendingOffers,
  createNewDaynode,
  getFoundationData,
} from "./databaseState";
import { fetchCurrencyRates, establishNewCXXrates } from "./currencyRates";
import { updateCredexBalances } from "./balanceUpdates";
import { processDCOTransactions } from "./transactions";
import { createNeo4jBackup } from "../DBbackup";
import { validateAmount, validateDenomination } from "../../../utils/validators";
import { GetSecuredAuthorizationService } from "../../../api/Credex/services/GetSecuredAuthorization";
import { Participant } from "./types";

/**
 * Finds all active DCO participants using recurring templates.
 * This is called once at the start of DCO execution to ensure consistency.
 */
async function findDCOParticipants(session: any): Promise<{
  confirmedParticipants: Participant[];
  DCOinCXX: number;
  DCOinXAU: number;
  numberConfirmedParticipants: number;
}> {
  const result = await session.run(`
    MATCH (daynode:Daynode {Active: true})
    MATCH (account:Account)-[:ACTIVE]->(template:Recurring {templateType: "DCO_GIVE", status: "ACTIVE"})-[:ACTIVE]->(foundation:Account)
    MATCH (member:Member)-[:OWNS]->(account)
    RETURN
      account.accountID AS accountID,
      member.memberID AS DCOmemberID,
      template.DCOgiveInCXX AS DCOgiveInCXX,
      template.DCOgiveInCXX / daynode[template.DCOdenom] AS DCOgiveInDenom,
      template.DCOdenom AS DCOdenom,
      template.recurringID AS recurringID
  `);

  const declaredParticipants = result.records;
  logInfo(`Declared participants: ${declaredParticipants.length}`);

  let DCOinCXX = 0;
  let DCOinXAU = 0;
  const confirmedParticipants: Participant[] = [];

  for (const participant of declaredParticipants) {
    const { accountID, DCOmemberID, DCOdenom, DCOgiveInCXX, DCOgiveInDenom, recurringID } =
      participant.toObject();

    if (
      !validateDenomination(DCOdenom) ||
      !validateAmount(DCOgiveInCXX) ||
      !validateAmount(DCOgiveInDenom)
    ) {
      logInfo("Invalid participant data", {
        accountID,
        DCOmemberID,
        DCOdenom,
        DCOgiveInCXX,
        DCOgiveInDenom,
        recurringID,
      });
      continue;
    }

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
        recurringID,  // Include the Recurring node's ID
      });
      DCOinCXX += DCOgiveInCXX;
      DCOinXAU += DCOgiveInDenom;
    }
  }

  const numberConfirmedParticipants = confirmedParticipants.length;
  logInfo(`Confirmed participants: ${numberConfirmedParticipants}`);

  return {
    confirmedParticipants,
    DCOinCXX,
    DCOinXAU,
    numberConfirmedParticipants
  };
}

/**
 * Executes the Daily Credcoin Offering (DCO) process.
 * This function handles the daily operations of the Credcoin system,
 * including rate updates, participant validation, and transaction processing.
 */
export async function DCOexecute(): Promise<boolean> {
  const dcoProcessId = uuidv4();
  const startTime = new Date();
  logInfo(`Starting DCOexecute. Process ID: ${dcoProcessId}`, {
    dcoProcessId,
    startTime,
  });

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const searchSpaceSession = searchSpaceDriver.session();

  try {
    await waitForMTQCompletion(ledgerSpaceSession);
    const { previousDate, nextDate } =
      await setDCORunningFlag(ledgerSpaceSession);

    const initialChecksum = await calculateSystemChecksum(ledgerSpaceSession);
    logInfo(`Initial system checksum: ${initialChecksum}`, {
      dcoProcessId,
      checksum: initialChecksum,
    });

    await createNeo4jBackup(previousDate, "_end");
    logInfo(`Created Neo4j backup for ${previousDate}_end`, { dcoProcessId });

    await handleDefaultingCredexes(ledgerSpaceSession);
    await expirePendingOffers(ledgerSpaceSession);

    // Find participants once at the start
    const participantData = await findDCOParticipants(ledgerSpaceSession);
    logInfo("DCO participant data", {
      numberParticipants: participantData.numberConfirmedParticipants,
      DCOinCXX: participantData.DCOinCXX,
      DCOinXAU: participantData.DCOinXAU
    });

    const USDbaseRates = await fetchCurrencyRates(nextDate);
    const {
      newCXXrates,
      CXXprior_CXXcurrent,
    } = await establishNewCXXrates(USDbaseRates, participantData);

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

    const { foundationID, foundationXOid } =
      await getFoundationData(ledgerSpaceSession);
    await processDCOTransactions(
      ledgerSpaceSession,
      foundationID,
      foundationXOid,
      participantData
    );

    await createNeo4jBackup(nextDate, "_start");
    logInfo(`Created Neo4j backup for ${nextDate}_start`, { dcoProcessId });

    const finalChecksum = await calculateSystemChecksum(ledgerSpaceSession);
    logInfo(`Final system checksum: ${finalChecksum}`, {
      dcoProcessId,
      checksum: finalChecksum,
    });

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    logInfo(`DCOexecute completed for ${nextDate}`, {
      dcoProcessId,
      startTime,
      endTime,
      duration,
      numberConfirmedParticipants: participantData.numberConfirmedParticipants,
      DCOinCXX: participantData.DCOinCXX,
      DCOinXAU: participantData.DCOinXAU,
      CXXprior_CXXcurrent,
    });

    return true;
  } catch (error) {
    logError("Error during DCOexecute", error as Error, { dcoProcessId });
    return false;
  } finally {
    try {
      await resetDCORunningFlag(ledgerSpaceSession);
    } catch (resetError) {
      logError("Error resetting DCO running flag", resetError as Error, {
        dcoProcessId,
      });
    }
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
  }
}
