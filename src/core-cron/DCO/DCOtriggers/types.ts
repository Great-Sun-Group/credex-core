import { Session } from "neo4j-driver";

export interface TriggerResult {
  success: boolean;
  message: string;
  error?: Error;
}

export interface TriggerContext {
  session: Session;
  requestId: string;
}

export interface MemberTierUpdate {
  memberId: string;
  previousTier: number;
  newTier: number;
  reason: string;
}

export type TriggerFunction = (context: TriggerContext) => Promise<TriggerResult>;
