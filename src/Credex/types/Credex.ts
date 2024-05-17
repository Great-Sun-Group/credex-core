export type Credex = {
    credexID?: string;
    Denomination?: string;
    date?: string;
    dateTime?: string;
    InitialAmount?: number;
    OutstandingAmount?: number;
    RedeemedAmount?: number;
    DefaultedAmount?: number;
    WrittenOffAmount?: number;
    formattedInitialAmount?: string;
    formattedOutstandingAmount?: string;
    formattedRedeemedAmount?: string;
    formattedDefaultedAmount?: string;
    formattedWrittenOffAmount?: string;
    dueDate?: string;
    transactionType?: string;
    debit?: boolean;
    issuerMemberID?: string;
    receiverMemberID?: string;
    counterpartyDisplayname?: string;
    securedCredex?: boolean;
    securerName?: string;
    securerID?: string;
    credexType?: string;
    OFFERSorREQUESTS?: string;
    offeredAt?: string;
    requestedAt?: string;
    acceptedAt?: string;
    declinedAt?: string;
    cancelledAt?: string;
    clearedAgainst?: any;
};
  