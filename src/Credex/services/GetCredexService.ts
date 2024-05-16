import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { getDenominations, denomFormatter } from '../../Core/constants/denominations';
import { Credex } from "../types/Credex";

export async function GetCredexService(credexID: string, memberID: string) {
    try {
        const ledgerSpaceSession = ledgerSpaceDriver.session()
        const result = await ledgerSpaceSession.run(`
            MATCH
            (member:Member{memberID:$memberID})
            -[transactionType:OWES|CLEARED|REQUESTS|OFFERS|DECLINED|CANCELLED]-
            (credex:Credex{credexID:$credexID})
            -[:OWES|CLEARED|REQUESTS|OFFERS|DECLINED|CANCELLED]
            -(counterparty:Member)
            OPTIONAL MATCH (credex)<-[:SECURES]-(securer:Member)
            OPTIONAL MATCH
            (credex)-[:CREDLOOP]-(clearedAgainstCredex:Credex)-[:OWES|CLEARED]-(member),
            (clearedAgainstCredex)-[:OWES|CLEARED]-(clearedAgainstCounterparty:Member)

            //WITH DISTINCT credex, member, transactionType, counterparty, securer, clearedAgainstCredex, clearedAgainstCounterparty

            RETURN
            credex.credexID AS credexID,
            type(transactionType) as transactionType,
            (startNode(transactionType) = member) as debit,
            counterparty.firstname AS counterpartyFirstname,
            counterparty.lastname AS counterpartyLastname,
            counterparty.companyname AS counterpartyCompanyname,
            counterparty.memberType AS counterpartyMemberType,
            securer.memberID AS securerID,
            securer.companyname AS securerName,
            credex.Denomination as Denomination,
            credex.InitialAmount/credex.CXXmultiplier AS InitialAmount,
            credex.OutstandingAmount/credex.CXXmultiplier AS OutstandingAmount,
            credex.RedeemedAmount/credex.CXXmultiplier AS RedeemedAmount,
            credex.DefaultedAmount/credex.CXXmultiplier AS DefaultedAmount,
            credex.WrittenOffAmount/credex.CXXmultiplier AS WrittenOffAmount,
            clearedAgainstCredex.credexID AS clearedAgainstCredexID,
            clearedAgainstCredex.InitialAmount AS clearedAgainstCredexInitialAmount,
            clearedAgainstCredex.Denomination AS clearedAgainstCredexDenomination,
            clearedAgainstCounterparty.firstname AS clearedAgainstCounterpartyFirstname,
            clearedAgainstCounterparty.lastname AS clearedAgainstCounterpartyLastname,
            clearedAgainstCounterparty.companyname AS clearedAgainstCounterpartyCompanyname,
            clearedAgainstCounterparty.memberType AS clearedAgainstCounterpartyMemberType
        `, {
            credexID: credexID,
            memberID: memberID,
        })
        await ledgerSpaceSession.close();

        // make negative if debit
        const debit = result.records[0].get('debit')
        const InitialAmount = debit === true ? parseFloat("-" + parseFloat(result.records[0].get('InitialAmount')))
            : debit === false ? parseFloat(result.records[0].get('InitialAmount'))
                : 0;;
        const OutstandingAmount = debit === true ? parseFloat("-" + parseFloat(result.records[0].get('OutstandingAmount')))
            : debit === false ? parseFloat(result.records[0].get('OutstandingAmount'))
                : 0;;
        const RedeemedAmount = debit === true ? parseFloat("-" + parseFloat(result.records[0].get('RedeemedAmount')))
            : debit === false ? parseFloat(result.records[0].get('RedeemedAmount'))
                : 0;;
        const DefaultedAmount = debit === true ? parseFloat("-" + parseFloat(result.records[0].get('DefaultedAmount')))
            : debit === false ? parseFloat(result.records[0].get('DefaultedAmount'))
                : 0;;
        const WrittenOffAmount = debit === true ? parseFloat("-" + parseFloat(result.records[0].get('WrittenOffAmount')))
            : debit === false ? parseFloat(result.records[0].get('WrittenOffAmount'))
                : 0;;

        //format amounts
        const Denomination = result.records[0].get('Denomination')
        const formattedInitialAmount = denomFormatter(
            InitialAmount, Denomination) + " " + Denomination
        const formattedOutstandingAmount = denomFormatter(
            OutstandingAmount, Denomination) + " " + Denomination
        const formattedRedeemedAmount = denomFormatter(
            RedeemedAmount, Denomination) + " " + Denomination
        const formattedDefaultedAmount = denomFormatter(
            DefaultedAmount, Denomination) + " " + Denomination
        const formattedWrittenOffAmount = denomFormatter(
            WrittenOffAmount, Denomination) + " " + Denomination

        // format counterparty name
        var counterpartyDisplayname
        const counterpartyMemberType = result.records[0].get('counterpartyMemberType')
        if (counterpartyMemberType == "HUMAN") {
            counterpartyDisplayname = result.records[0].get('counterpartyFirstname') + " "
                + result.records[0].get('counterpartyLastname')
        }
        if (counterpartyMemberType == "COMPANY" || counterpartyMemberType == "CREDEX_FOUNDATION") {
            counterpartyDisplayname = result.records[0].get('counterpartyCompanyname')
        }

        const credexData: Credex =
        {
            "credexID": result.records[0].get('credexID'),
            "transactionType": result.records[0].get('transactionType'),
            "debit": debit,
            "counterpartyDisplayname": counterpartyDisplayname,
            "securerID": result.records[0].get('securerID'),
            "securerName": result.records[0].get('securerName'),
            "Denomination": Denomination,
            "InitialAmount": InitialAmount,
            "OutstandingAmount": OutstandingAmount,
            "RedeemedAmount": RedeemedAmount,
            "DefaultedAmount": DefaultedAmount,
            "WrittenOffAmount": WrittenOffAmount,
            "formattedInitialAmount": formattedInitialAmount,
            "formattedOutstandingAmount": formattedOutstandingAmount,
            "formattedRedeemedAmount": formattedRedeemedAmount,
            "formattedDefaultedAmount": formattedDefaultedAmount,
            "formattedWrittenOffAmount": formattedWrittenOffAmount,
        }

        var clearedAgainstData: any = []
        if (result.records[0].get('clearedAgainstCredexID')) {
            result.records.forEach(async function (record) {
                const clearedAgainstCredexID = record.get('clearedAgainstCredexID')
                const clearedAgainstCredexInitialAmount = record.get('clearedAgainstCredexInitialAmount')
                const clearedAgainstCredexDenomination = record.get('clearedAgainstCredexDenomination')
                const clearedAgainstCounterpartyFirstname = record.get('clearedAgainstCounterpartyFirstname')
                const clearedAgainstCounterpartyLastname = record.get('clearedAgainstCounterpartyLastname')
                const clearedAgainstCounterpartyCompanyname = record.get('clearedAgainstCounterpartyCompanyname')
                const clearedAgainstCounterpartyMemberType = record.get('clearedAgainstCounterpartyMemberType')

                const signumClearedAgainstCredexInitialAmount: number =
                    debit === false ? parseFloat("-" + clearedAgainstCredexInitialAmount) :
                        debit === true ? parseFloat(clearedAgainstCredexInitialAmount) :
                            0;;
                const formattedClearedAgainstCredexInitialAmount = denomFormatter(
                    signumClearedAgainstCredexInitialAmount,
                    clearedAgainstCredexDenomination
                )
                var clearedAgainstCounterpartyDisplayname = ""
                if (clearedAgainstCounterpartyMemberType == "HUMAN") {
                    clearedAgainstCounterpartyDisplayname = clearedAgainstCounterpartyFirstname + " " + clearedAgainstCounterpartyLastname
                }
                if (clearedAgainstCounterpartyMemberType == "COMPANY" || clearedAgainstCounterpartyMemberType == "CREDEX_FOUNDATION") {
                    clearedAgainstCounterpartyDisplayname = clearedAgainstCounterpartyCompanyname
                }

                const thisClearedAgainstCredex = {
                    "clearedAgainstCredexID": clearedAgainstCredexID,
                    "ClearedAgainstCredexInitialAmount": clearedAgainstCredexInitialAmount,
                    "clearedAgainstCredexDenomination": clearedAgainstCredexDenomination,
                    "formattedClearedAgainstCredexInitialAmount": formattedClearedAgainstCredexInitialAmount + " " + clearedAgainstCredexDenomination,
                    "clearedAgainstCounterpartyDisplayname": clearedAgainstCounterpartyDisplayname,
                }
                clearedAgainstData.push(thisClearedAgainstCredex)

            });
        }

        return {
            "credexData": credexData,
            "clearedAgainstData": clearedAgainstData,
        }
    } catch (error) {
        console.log(error)
    }
}