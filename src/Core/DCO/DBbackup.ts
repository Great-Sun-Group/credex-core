import { ledgerSpaceDriver, searchSpaceDriver } from "../../../config/neo4j";
import fs from "fs";
import path from "path";

const exportDatabase = async (
  driver: any,
  databaseName: string,
  previousDate: string,
  append: string
): Promise<void> => {
  const session = driver.session();
  try {
    const fileName = `${previousDate}_${databaseName}${append}.json`;
    const filePath = path.join(__dirname, "DCOsnapshots", fileName);

    const result = await session.run(`
      CALL apoc.export.json.all(null, {stream:true, useTypes:true})
    `);

    const records = result.records;
    let jsonData = "";
    records.forEach((record: any) => {
      jsonData += record.get(0);
    });

    fs.writeFileSync(filePath, jsonData);
    console.log(`Backup for ${databaseName} created successfully: ${filePath}`);
  } catch (error) {
    console.error(`Error creating backup for ${databaseName}:`, error);
    throw error;
  } finally {
    await session.close();
  }
};

export const createNeo4jBackup = async (
  previousDate: string,
  append: string
): Promise<void> => {
  try {
    await exportDatabase(ledgerSpaceDriver, "ledgerSpace_dev", previousDate, append);
    await exportDatabase(
      searchSpaceDriver,
      "searchSpace_dev",
      previousDate,
      append
    );
    console.log("Both databases backed up successfully.");
  } catch (error) {
    console.error("Error creating backups:", error);
    throw error;
  }
};
