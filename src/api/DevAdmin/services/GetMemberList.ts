import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { logDebug, logInfo, logError } from "../../../utils/logger";

interface MemberInfo {
  phone: string;
  memberID: string;
}

export class GetMemberListService {
  static async execute(count: number): Promise<MemberInfo[]> {
    logDebug(`Entering GetMemberList.execute`, { count });

    const ledgerSpaceSession = ledgerSpaceDriver.session();

    try {
      logDebug(`Attempting to fetch random members from database`, { count });
      const result = await ledgerSpaceSession.run(
        `
        MATCH (m:Member)
        WITH m, rand() AS r
        ORDER BY r
        LIMIT $count
        RETURN m.phone AS phone, m.memberID AS memberID
        `,
        { count }
      );

      if (result.records.length === 0) {
        logInfo(`No members found`);
        return [];
      }

      const memberList: MemberInfo[] = result.records.map((record: unknown) => {
        const typedRecord = record as { get: (key: string) => string };
        return {
          phone: typedRecord.get('phone'),
          memberID: typedRecord.get('memberID')
        };
      });

      logInfo(`Successfully fetched random members`, { count: memberList.length });
      return memberList;
    } catch (error) {
      logError(`Error in GetMemberList.execute:`, error as Error, { count });
      throw error;
    } finally {
      await ledgerSpaceSession.close();
      logDebug(`Exiting GetMemberList.execute`, { count });
    }
  }
}