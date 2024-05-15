export type Credex = {
    credexID: string;
    Denomination: string;
    InitialAmount: number;
    OutstandingAmount: number;
    RedeemedAmount: number;
    DefaultedAmount: number;
    WrittenOffAmount: number;
    dueDate: string;
    transactionType: string;
    debit: boolean;
    issuerMemberID: string;
    receiverMemberID: string;
    counterpartyDisplayname: string;
    securedCredex: boolean;
    securerDisplayName: string;
    securerID: string;
    credexType: string;
    OFFERSorREQUESTS: string;
    /*
    these below are multiple objects that can be attached to a credex
    not sure how to manage this in TS, which doesn't have a type of Object available?
    clearedAgainstCredexID: number
    clearedAgainstCredexAmount: number;
    clearedAgainstCredexDenomination: string;
    clearedAgainstCounterpartyDisplayname: string;
    */
};
  