import logger from "../../../utils/logger";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";
import { ledgerSpaceDriver, searchSpaceDriver } from "../../../../config/neo4j";

export async function ClearDevDBsService(): Promise<void> {
  const clearDatabase = async (driver: any, name: string) => {
    const session = driver.session();
    try {
      logger.debug(`Attempting to clear ${name} database`);
      await session.run("MATCH (n) DETACH DELETE n");
      logger.info(`${name} database cleared successfully`);
    } catch (error) {
      logger.error(`Error clearing ${name} database`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new AdminError(
        `Error clearing ${name} database`, 
        'INTERNAL_ERROR', 
        ErrorCodes.Admin.INTERNAL_ERROR
      );
    } finally {
      await session.close();
      logger.debug(`Database session closed for ${name}`);
    }
  };

  try {
    logger.info('Starting database clearing process');
    
    // Clear databases sequentially to avoid potential conflicts
    await clearDatabase(ledgerSpaceDriver, "LedgerSpace");
    await clearDatabase(searchSpaceDriver, "SearchSpace");
    
    logger.info('All development databases cleared successfully');
  } catch (error) {
    logger.error('Error in database clearing process', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof AdminError) {
      throw error;
    }
    
    throw new AdminError(
      'Failed to clear development databases', 
      'INTERNAL_ERROR', 
      ErrorCodes.Admin.INTERNAL_ERROR
    );
  }
}
