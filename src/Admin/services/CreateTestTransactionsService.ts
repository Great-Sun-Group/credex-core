import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { OfferCredexService } from "../../Credex/services/OfferCredexService";
import { AcceptCredexService } from "../../Credex/services/AcceptCredexService";
import { FoundationAuditedCheckService } from "../../Member/services/FoundationAuditedCheckService";
import { GetSecurableDataService } from "../../Credex/services/GetSecurableDataService";
import { random } from "lodash";
import { Credex } from "../../Credex/types/Credex";

async function getRandCounterparties() {
    var ledgerSpaceSession = ledgerSpaceDriver.session();
    const getRandomCounterpartiesQuery = await ledgerSpaceSession.run(`
      MATCH (members1:Member)
      WITH members1, rand() AS rand1
      ORDER BY rand1
      WITH members1.memberID AS memberID_1 LIMIT 1
      MATCH (members2:Member)
      WHERE members2.memberID <> memberID_1
      WITH memberID_1, members2, rand() AS rand2
      ORDER BY rand2
      RETURN memberID_1, members2.memberID AS memberID_2 LIMIT 1
    `)

    return {
        "memberID_1": getRandomCounterpartiesQuery.records[0].get("memberID_1"),
        "memberID_2": getRandomCounterpartiesQuery.records[0].get("memberID_2"),
    }
}

export async function CreateTestTransactionsService(numNewTransactions: number) {
    let credexesCreated = []

    // Iterate numNewTransactions times
    for (let i = 0; i < numNewTransactions; i++) {
        const counterparties = await getRandCounterparties()
        const issuerMemberID = counterparties.memberID_1
        const receiverMemberID = counterparties.memberID_2
        const InitialAmount = random(100)
        const Denomination = "USD"

        //check ability to issue secured credex
        var securedCredexApproved = await FoundationAuditedCheckService(issuerMemberID)
        if (!securedCredexApproved) {
            const securableData = await GetSecurableDataService(issuerMemberID, Denomination)
            if (securableData.netSecurableInDenom >= InitialAmount) {
                securedCredexApproved = true
            }
            else {
                securedCredexApproved = false
            }
        }

        //if able to issue secured credex, 75% chance credex is secured
        let secured
        if (securedCredexApproved) {
            secured = Math.random() < 0.75
        } else {
            secured = false
        }

        const credexSpecs: Credex = {
            "issuerMemberID": issuerMemberID,
            "receiverMemberID": receiverMemberID,
            "Denomination": Denomination,
            "InitialAmount": InitialAmount,
            "credexType": "PURCHASE",
            "dueDate": "2024-03-25",
            "securedCredex": secured,
        };
        const newcredexID = await OfferCredexService(credexSpecs);
        const acceptingID = await AcceptCredexService(newcredexID);
        credexesCreated.push(acceptingID)

    }
    console.log(numNewTransactions + " new transactions created");
    return credexesCreated
}