import { ledgerSpaceDriver } from "../../../config/neo4j";
import {
  getDenominations,
  denomFormatter,
} from "../../Core/constants/denominations";
import { checkPermittedCredexType } from "../../Core/constants/credexTypes";

export async function CreateRecurringService(recurringData: any) {
  const {
    signerMemberID,
    requestorAccountID,
    counterpartyAccountID,
    InitialAmount,
    Denomination,
    credexType,
    OFFERSorREQUESTS,
    nextPayDate,
    daysBetweenPays,
    remainingPays,
    // Include all fields required for CreateCredex service
    securedCredex = false,
    dueDate = "",
  } = recurringData;

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  // Validate input data
  if (
    !signerMemberID ||
    !requestorAccountID ||
    !counterpartyAccountID ||
    requestorAccountID === counterpartyAccountID ||
    !InitialAmount ||
    !Denomination ||
    !credexType ||
    !OFFERSorREQUESTS ||
    !nextPayDate ||
    !daysBetweenPays ||
    typeof InitialAmount !== "number" ||
    typeof daysBetweenPays !== "number" ||
    (remainingPays !== undefined && typeof remainingPays !== "number")
  ) {
    let failMessage =
      "Data missing or invalid, could not create recurring template.";
    console.log(failMessage);
    console.log(recurringData);
    return { recurring: false, message: failMessage };
  }

  // Check denomination validity
  if (!getDenominations({ code: Denomination }).length) {
    const message = "Error: denomination not permitted";
    console.log(message);
    return { recurring: false, message };
  }

  // Check credex type validity
  if (!checkPermittedCredexType(credexType)) {
    const message = "Error: credex type not permitted";
    console.log(message);
    return { recurring: false, message };
  }

  // Validate OFFERSorREQUESTS
  if (OFFERSorREQUESTS !== "OFFERS" && OFFERSorREQUESTS !== "REQUESTS") {
    const message = "Error: invalid OFFER/REQUEST";
    console.log(message);
    return { recurring: false, message };
  }

  try {
    // Create the Recurring node
    const createRecurringQuery = await ledgerSpaceSession.run(
      `
      MATCH
        (requestor:Account {accountID: $requestorAccountID})<-[:AUTHORIZED_FOR]-
        (signer:Member|Avatar { memberID: $signerMemberID })
      MATCH (counterparty:Account {accountID: $counterpartyAccountID})
      CREATE (recurring:Avatar)
      SET
        recurring.avatarType = "RECURRING",
        recurring.memberID = randomUUID(),
        recurring.Denomination = $Denomination,
        recurring.InitialAmount = $InitialAmount,
        recurring.credexType = $credexType,
        recurring.nextPayDate = date($nextPayDate),
        recurring.daysBetweenPays = $daysBetweenPays,
        recurring.createdAt = datetime(),
        recurring.remainingPays = $remainingPays
      MERGE (requestor)<-[:REQUESTS]-(recurring)<-[:REQUESTS]-(counterparty)
      MERGE (requestor)<-[:REQUESTED]-(recurring)<-[:REQUESTED]-(counterparty)
      MERGE (signer)-[:SIGNED]->(recurring)
      RETURN
        recurring.memberID AS memberID,
        counterparty.accountName AS counterpartyAccountName
      `,
      {
        signerMemberID,
        requestorAccountID,
        counterpartyAccountID,
        InitialAmount,
        Denomination,
        credexType,
        nextPayDate,
        daysBetweenPays,
        remainingPays: remainingPays,
        OFFERSorREQUESTS,
      }
    );

    const memberID = createRecurringQuery.records[0].get("memberID");
    const counterpartyAccountName = createRecurringQuery.records[0].get(
      "counterpartyAccountName"
    );

    const newRecurring = {
      memberID,
      formattedInitialAmount: denomFormatter(InitialAmount, Denomination),
      counterpartyAccountName,
      nextPayDate,
      daysBetweenPays,
      remainingPays: remainingPays || "Indefinite",
    };

    return {
      recurring: newRecurring,
      message: "Recurring template created: " + memberID,
    };
  } catch (error) {
    return {
      recurring: false,
      message: "Error creating recurring template: " + error,
    };
  } finally {
    await ledgerSpaceSession.close();
  }
}
