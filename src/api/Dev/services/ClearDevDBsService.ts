import logger from "../../../utils/logger";
import { ledgerSpaceDriver, searchSpaceDriver } from "../../../../config/neo4j";

export const ClearDevDBsService = async (): Promise<void> => {
  const clearDatabase = async (driver: any, name: string) => {
    const session = driver.session();
    try {
      await session.run("MATCH (n) DETACH DELETE n");
      logger.info(`${name} database cleared successfully`);
    } catch (error) {
      logger.error(`Error clearing ${name} database`, {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await session.close();
    }
  };

  await clearDatabase(ledgerSpaceDriver, "LedgerSpace");
  await clearDatabase(searchSpaceDriver, "SearchSpace");
};
