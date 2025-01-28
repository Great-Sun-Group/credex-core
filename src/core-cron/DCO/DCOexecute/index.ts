import { v4 as uuidv4 } from "uuid";
import { ledgerSpaceDriver, searchSpaceDriver } from "../../../../config/neo4j";
import { logInfo, logError } from "../../../utils/logger";
import { calculateSystemChecksum } from "./checksum";
import { performPreDCOAudit, performPostDCOAudit, generateDailyAuditReport } from "./auditChecks";
import { recordAuditIncident, restoreFromBackup } from "./auditIncidents";
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
import { ServiceResult } from "../../../types/apiResponse";
import { Participant } from "./types";

interface SecuredAuthorizationData {
  securerID: string | null;
  securableAmountInDenom: number;
}

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
    WITH 
      account, member, template, daynode,
      daynode.XAU / daynode[template.DCOdenom] as denomToXAUrate
    RETURN
      account.accountID AS accountID,
      member.memberID AS DCOmemberID,
      template.DCOgiveInCXX AS DCOgiveInCXX,
      template.DCOgiveInCXX / daynode[template.DCOdenom] AS DCOgiveInDenom,
      template.DCOdenom AS DCOdenom,
      template.recurringID AS recurringID,
      denomToXAUrate AS denomToXAUrate
  `);

  const declaredParticipants = result.records;
  logInfo(`Declared participants: ${declaredParticipants.length}`);

  let DCOinCXX = 0;
  let DCOinXAU = 0;
  const confirmedParticipants: Participant[] = [];

  for (const participant of declaredParticipants) {
    const { 
      accountID, 
      DCOmemberID, 
      DCOdenom, 
      DCOgiveInCXX, 
      DCOgiveInDenom, 
      recurringID,
      denomToXAUrate 
    } = participant.toObject();

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

    const securedAuthResult = await GetSecuredAuthorizationService(
      accountID,
      DCOdenom
    );

    if (!securedAuthResult.success || !securedAuthResult.data) {
      logInfo("Failed to get secured authorization", {
        accountID,
        DCOdenom,
        error: securedAuthResult.message,
        details: securedAuthResult.error?.details
      });
      continue;
    }

    const { securableAmountInDenom } = securedAuthResult.data;

    if (DCOgiveInDenom <= securableAmountInDenom) {
      confirmedParticipants.push({
        accountID,
        DCOmemberID,
        DCOdenom,
        DCOgiveInCXX,
        DCOgiveInDenom,
        recurringID,
      });
      DCOinCXX += DCOgiveInCXX;
      // Convert to XAU using current day's rates
      DCOinXAU += DCOgiveInDenom * denomToXAUrate;
    } else {
      logInfo("Insufficient securable amount", {
        accountID,
        DCOdenom,
        required: DCOgiveInDenom,
        available: securableAmountInDenom
      });
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

    // Perform pre-DCO audit checks and backup
    await createNeo4jBackup(previousDate, "_pre_audit");
    const preAuditResult = await performPreDCOAudit(ledgerSpaceSession);
    if (!preAuditResult.success || !preAuditResult.details.matchStatus) {
      logError("Pre-DCO audit failed: Trust account balances do not match secured balances", new Error("Pre-DCO Audit Failure"), {
        dcoProcessId,
        discrepancies: preAuditResult.details.discrepancies,
        timestamp: preAuditResult.details.timestamp
      });
      // Continue with DCO but record the incident
      await recordAuditIncident(ledgerSpaceSession, "PRE_DCO_AUDIT_FAILURE", preAuditResult.details);
    }
    logInfo("Pre-DCO audit passed", {
      dcoProcessId,
      timestamp: preAuditResult.details.timestamp,
      checksum: preAuditResult.details.checksum
    });

    const initialChecksum = preAuditResult.details.checksum;
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

    // Perform post-DCO audit checks with rollback capability
    const postAuditResult = await performPostDCOAudit(ledgerSpaceSession);
    if (!postAuditResult.success || !postAuditResult.details.matchStatus) {
      logError("Post-DCO audit failed: Trust account balances do not match secured balances", new Error("Post-DCO Audit Failure"), {
        dcoProcessId,
        discrepancies: postAuditResult.details.discrepancies,
        timestamp: postAuditResult.details.timestamp
      });

      // Restore system to pre-DCO state
      try {
        await restoreFromBackup(previousDate, "_pre_audit");
        logInfo("System restored to pre-DCO state due to audit failure", {
          dcoProcessId,
          timestamp: new Date().toISOString()
        });
      } catch (restoreError) {
        logError("Failed to restore system to pre-DCO state", restoreError as Error, {
          dcoProcessId,
          originalError: "Post-DCO Audit Failure"
        });
      }

      // Record the incident and continue
      await recordAuditIncident(ledgerSpaceSession, "POST_DCO_AUDIT_FAILURE", postAuditResult.details);
      
      // Re-run DCO operations
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

      await processDCOTransactions(
        ledgerSpaceSession,
        foundationID,
        foundationXOid,
        participantData
      );
    }
    logInfo("Post-DCO audit passed", {
      dcoProcessId,
      timestamp: postAuditResult.details.timestamp,
      checksum: postAuditResult.details.checksum
    });

    // Generate daily audit report
    const auditReport = await generateDailyAuditReport(ledgerSpaceSession);
    logInfo("Daily audit report generated", {
      dcoProcessId,
      reportLength: auditReport.length
    });

    await createNeo4jBackup(nextDate, "_start");
    logInfo(`Created Neo4j backup for ${nextDate}_start`, { dcoProcessId });

    const finalChecksum = postAuditResult.details.checksum;
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
