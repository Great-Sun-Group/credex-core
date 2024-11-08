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

    const USDbaseRates = await fetchCurrencyRates(nextDate);
    const {
      newCXXrates,
      CXXprior_CXXcurrent,
      DCOinCXX,
      DCOinXAU,
      numberConfirmedParticipants,
    } = await establishNewCXXrates(ledgerSpaceSession, USDbaseRates);

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
      DCOinCXX,
      numberConfirmedParticipants
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
      numberConfirmedParticipants,
      DCOinCXX,
      DCOinXAU,
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
