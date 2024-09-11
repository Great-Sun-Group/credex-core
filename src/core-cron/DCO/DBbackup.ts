import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import fs from "fs";
import path from "path";
import logger from "../../utils/logger";

const exportDatabase = async (
  driver: any,
  databaseName: string,
  previousDate: string,
  append: string
): Promise<void> => {
  const session = driver.session();
  logger.debug(`Starting backup for ${databaseName}`, { previousDate, append });

  try {
    const fileName = `${previousDate}_${databaseName}${append}.json`;
    const filePath = path.join(__dirname, "DCOsnapshots", fileName);

    logger.debug(`Executing export query for ${databaseName}`);
    const result = await session.run(`
      CALL apoc.export.json.all(null, {stream:true, useTypes:true})
    `);

    const records = result.records;
    let jsonData = "";
    records.forEach((record: any) => {
      jsonData += record.get(0);
    });

    logger.debug(`Writing backup data to file: ${filePath}`);
    fs.writeFileSync(filePath, jsonData);
    logger.info(`Backup for ${databaseName} created successfully`, {
      filePath,
    });
  } catch (error) {
    logger.error(`Error creating backup for ${databaseName}`, {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      databaseName,
      previousDate,
      append,
    });
    throw error;
  } finally {
    logger.debug(`Closing session for ${databaseName}`);
    await session.close();
  }
};

export const createNeo4jBackup = async (
  previousDate: string,
  append: string
): Promise<void> => {
  logger.info("Starting Neo4j backup process", { previousDate, append });

  try {
    logger.debug("Backing up ledgerSpace_dev");
    await exportDatabase(
      ledgerSpaceDriver,
      "ledgerSpace_dev",
      previousDate,
      append
    );

    logger.debug("Backing up searchSpace_dev");
    await exportDatabase(
      searchSpaceDriver,
      "searchSpace_dev",
      previousDate,
      append
    );

    logger.info("Both databases backed up successfully", {
      previousDate,
      append,
    });
  } catch (error) {
    logger.error("Error creating backups", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      previousDate,
      append,
    });
    throw error;
  }
};
