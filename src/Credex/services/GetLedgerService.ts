import * as neo4j from "neo4j-driver";
import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { denomFormatter } from '../../Core/constants/denominations';
import { Credex } from "../types/Credex";
const _ = require("lodash");
const moment = require('moment-timezone');

export async function GetLedgerService(memberID: string, numRows: number, startRow: number) {
    numRows = Math.round(Number(numRows))
    startRow = Math.round(Number(startRow))
    try {
        const ledgerSpaceSession = ledgerSpaceDriver.session()
        const result = await ledgerSpaceSession.run(`
        OPTIONAL MATCH
            (member:Member{memberID:$memberID})-[transactionType:OWES|CLEARED]-(credex:Credex)-[:OWES|CLEARED]-(counterparty:Member)
        OPTIONAL MATCH (credex)<-[:SECURES]-(securer:Member)
        RETURN
            credex.credexID AS credexID,
            credex.InitialAmount/credex.CXXmultiplier AS InitialAmount,
            credex.OutstandingAmount/credex.CXXmultiplier AS OutstandingAmount,
            credex.Denomination AS Denomination,
            credex.acceptedAt AS dateTime,
            type(transactionType) as transactionType,
            (startNode(transactionType) = member) as debit,
            counterparty.firstname AS counterpartyFirstname,
            counterparty.lastname AS counterpartyLastname,
            counterparty.companyname AS counterpartyCompanyname,
            counterparty.memberType AS counterpartyMemberType,
            securer.companyname AS securerName
            ORDER BY credex.acceptedAt
            SKIP $startRow
            LIMIT $numRows
    `, {
            memberID: memberID,
            numRows: neo4j.int(numRows),
            startRow: neo4j.int(startRow)
        });
        await ledgerSpaceSession.close();

        var theseCredexes: any = []
        if (result.records[0].get('credexID')) {
            result.records.forEach(async function (record) {
                const credexID = record.get('credexID')
                const debit = record.get('debit')
                const InitialAmount = debit === true ? parseFloat("-" + record.get('InitialAmount'))
                    : debit === false ? parseFloat(record.get('InitialAmount'))
                    : 0;;
                const OutstandingAmount = debit === true ? parseFloat("-" + record.get('OutstandingAmount'))
                    : debit === false ? parseFloat(record.get('OutstandingAmount'))
                    : 0;;
                const Denomination = record.get('Denomination')
                const date = moment(record.get('dateTime'))
                    .month(moment(record.get('dateTime'))
                    .month()-1)//because moment uses Jan = 0 and cypher uses Jan = 1
                    .format("MMM D, YYYY")
                const counterpartyFirstname = record.get('counterpartyFirstname')
                const counterpartyLastname = record.get('counterpartyLastname')
                const counterpartyCompanyname = record.get('counterpartyCompanyname')
                const counterpartyMemberType = record.get('counterpartyMemberType')
                const securerName = record.get('securerName')

                const formattedInitialAmount = denomFormatter(
                    InitialAmount,
                    Denomination) + " " + Denomination
                const formattedOutstandingAmount = denomFormatter(
                    OutstandingAmount,
                    Denomination) + " " + Denomination

                var counterpartyDisplayname = ""
                if (counterpartyMemberType == "HUMAN") {
                    counterpartyDisplayname = counterpartyFirstname + " " + counterpartyLastname
                }
                if (counterpartyMemberType == "COMPANY" || counterpartyMemberType == "CREDEX_FOUNDATION") {
                    counterpartyDisplayname = counterpartyCompanyname
                }

                const thisCredex: Credex = {
                    "credexID": credexID,
                    "transactionType": record.get('transactionType'),
                    "formattedInitialAmount": formattedInitialAmount,
                    "formattedOutstandingAmount": formattedOutstandingAmount,
                    "date": date,
                    "counterpartyDisplayname": counterpartyDisplayname,
                    "securerName": securerName,
                }
                theseCredexes.push(thisCredex)
            });
        }

        return theseCredexes

    } catch (error) {
        console.log(error)
    }
}