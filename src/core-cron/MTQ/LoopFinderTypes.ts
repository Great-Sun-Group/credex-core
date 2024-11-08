import * as neo4j from "neo4j-driver";

export interface CredloopResult {
  valueToClear: number;
  credexesInLoop: string[];
  credexesRedeemed: string[];
}

export interface DatabaseSessions {
  ledgerSpaceSession: neo4j.Session;
  searchSpaceSession: neo4j.Session;
}
