import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { getDenominations } from "../../Core/constants/denominations";
import { FoundationAuditedCheckService } from "../../Member/services/FoundationAuditedCheckService"
import { GetSecurableDataService } from "./GetSecurableDataService"
import { Credex } from "../types/Credex";


export async function CreateCredexService(credexData: Credex) {
    if (
        credexData.issuerMemberID &&
        credexData.receiverMemberID &&
        credexData.Denomination &&
        credexData.InitialAmount &&
        credexData.credexType &&
        credexData.OFFERSorREQUESTS
        /* these don't work because null and empty values have to be passed through sometimes
        credexData.dueDate && //need to check if permitted
        credexData.securedCredex
        */
    ) {
        var securedCredexApproved = false
        var securableData = {
            securingMemberID: "",
            netSecurableInDenom: 0
        }
        var newCredexID = null

        //if issuer wants to pay with a secured credex
        if (credexData.securedCredex) {
            console.log("check for secured credex authorization")
            //check if issuer is CREDEX_FOUNDATION_AUDITED
            securedCredexApproved = await FoundationAuditedCheckService(credexData.issuerMemberID)
            securableData.securingMemberID = credexData.issuerMemberID
            console.log("Credex Foundation audited: " + securedCredexApproved)

            //if issuer not foundationAudited, verify that the required
            //secured balance is available for the transaction
            if (!securedCredexApproved) {
                console.log("not Credex Foundation audited, checking secured balance")

                securableData = await GetSecurableDataService(credexData.issuerMemberID, credexData.Denomination)

                //if securable amount is greater than amount of credex
                if (securableData.netSecurableInDenom >= credexData.InitialAmount) {
                    console.log("securableData.netSecurableInDenom: " + securableData.netSecurableInDenom)
                    securedCredexApproved = true
                    console.log("Secured balance available")

                }
                else {
                    securedCredexApproved = false
                    console.log("Secured balance not available")
                }
            }
        }

        //create credex if unsecured
        //or if the secured amount has been approved
        if (!credexData.securedCredex || securedCredexApproved) {
            const ledgerSpaceSession = ledgerSpaceDriver.session()
            const createCredexQuery = await ledgerSpaceSession.run(`
                MATCH (daynode:DayNode{Active:true})
                CREATE (newCredex:Credex)
                SET
                    newCredex.credexID = randomUUID(),
                    newCredex.Denomination = $Denomination,
                    newCredex.CXXmultiplier = daynode[$Denomination],
                    newCredex.InitialAmount = $Amount*daynode[$Denomination],
                    newCredex.OutstandingAmount = $Amount*daynode[$Denomination],
                    newCredex.RedeemedAmount = 0,
                    newCredex.DefaultedAmount = 0,
                    newCredex.WrittenOffAmount = 0,
                    newCredex.credexType = $credexType,
                    newCredex.dueDate = $dueDate,
                    newCredex.queueStatus = "PENDING_CREDEX"
                MERGE (newCredex)-[:CREATED_ON]->(daynode)
                RETURN newCredex.credexID AS credexID
            `, {
                Denomination: credexData.Denomination,
                Amount: credexData.InitialAmount,
                credexType: credexData.credexType,
                dueDate: credexData.dueDate,
            })
            newCredexID = createCredexQuery.records[0].get("credexID")

            //add transaction relationships
            if (credexData.OFFERSorREQUESTS == "OFFERS") {
                const createOfferRelsQuery = await ledgerSpaceSession.run(`
                MATCH (issuer:Member{memberID:$issuerMemberID})
                MATCH (receiver:Member{memberID:$receiverMemberID})
                MATCH (newCredex:Credex{credexID:$credexID})
                MERGE
                    (issuer)-[:OFFERS]->
                    (newCredex)-[:OFFERS]->
                    (receiver)
                MERGE
                    (issuer)-[:OFFERED]->
                    (newCredex)-[:OFFERED]->
                    (receiver)
            `, {
                    issuerMemberID: credexData.issuerMemberID,
                    receiverMemberID: credexData.receiverMemberID,
                    credexID: newCredexID,
                })
            }

            else if (credexData.OFFERSorREQUESTS == "REQUESTS") {
                const createRequestRelsQuery = await ledgerSpaceSession.run(`
                    MATCH (issuer:Member{memberID:$issuerMemberID})
                    MATCH (receiver:Member{memberID:$receiverMemberID})
                    MATCH (newCredex:Credex{credexID:$credexID})
                    MERGE
                        (issuer)-[:REQUESTS]->
                        (newCredex)-[:REQUESTS]->
                        (receiver)
                    MERGE
                        (issuer)-[:REQUESTED]->
                        (newCredex)-[:REQUESTED]->
                        (receiver)
                `, {
                    issuerMemberID: credexData.issuerMemberID,
                    receiverMemberID: credexData.receiverMemberID,
                    credexID: newCredexID,
                })
            }

            //add secured relationships if appropriate
            if (securedCredexApproved) {
                const createSecuredRelsQuery = await ledgerSpaceSession.run(`
                    MATCH (newCredex:Credex{credexID:$credexID})
                    MATCH (securingMember:Member{memberID:$securingMemberID})
                    MERGE (securingMember)-[:SECURES]->(newCredex)
                `, {
                    credexID: newCredexID,
                    securingMemberID: securableData.securingMemberID,
                })
            }
            await ledgerSpaceSession.close()
        }
        else if (credexData.securedCredex && !securedCredexApproved) {
            if (securableData.netSecurableInDenom > 0) {
                console.log(
                    "Sorry, the maximum securable "
                    + credexData.Denomination
                    + " credex you can issue is "
                    + securableData.netSecurableInDenom
                    + " "
                    + credexData.Denomination
                    + ", secured by "
                    + securableData.securingMemberID
                )
                return "Sorry, the maximum securable "
                    + credexData.Denomination
                    + " credex you can issue is "
                    + securableData.netSecurableInDenom
                    + " "
                    + credexData.Denomination
                    + ", secured by "
                    + securableData.securingMemberID
            }
            else {
                console.log("Sorry, you don't have a securable balance in " + credexData.Denomination)
                return "Sorry, you don't have a securable balance in " + credexData.Denomination
            }

        }
        console.log("credex created: " + newCredexID)
        return newCredexID
    }
    else {
        return false
    }
}
