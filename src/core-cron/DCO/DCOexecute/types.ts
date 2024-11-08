import { Denomination } from "../../../constants/denominations";

export interface Rates {
  [key: string]: number;
}

export interface Participant {
  accountID: string;
  DCOmemberID: string;
  DCOgiveInCXX: number;
  DCOgiveInDenom: number;
  DCOdenom: string;
}

export interface FoundationData {
  foundationID: string;
  foundationXOid: string;
}

export interface DCOResult {
  newCXXrates: Rates;
  CXXprior_CXXcurrent: number;
  DCOinCXX: number;
  DCOinXAU: number;
  numberConfirmedParticipants: number;
  confirmedParticipants: Participant[];
}
