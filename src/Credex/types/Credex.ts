export type Credex = {
    credexID: string;
    Denomination: string;
    InitialAmount: number;
    OutstandingAmount: number;
    RedeemedAmount: number;
    DefaultedAmount: number;
    WrittenOffAmount: number;
    transactionType: string;
    debit: boolean;
    counterpartyDisplayname: string;
    securerDisplayName: string;
    securerID: string;
    /*
    these below are multiple objects that can be attached to a credex
    not sure how to manage this in TS, which doesn't have a type of Object available?
    clearedAgainstCredexID: number
    clearedAgainstCredexAmount: number;
    clearedAgainstCredexDenomination: string;
    clearedAgainstCounterpartyDisplayname: string;
    */
};
  