"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNeo4jBackup = void 0;
const neo4j_1 = require("../../../config/neo4j");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const exportDatabase = async (driver, databaseName, previousDate, append) => {
    const session = driver.session();
    try {
        const fileName = `${previousDate}_${databaseName}${append}.json`;
        const filePath = path_1.default.join(__dirname, "DCOsnapshots", fileName);
        const result = await session.run(`
      CALL apoc.export.json.all(null, {stream:true, useTypes:true})
    `);
        const records = result.records;
        let jsonData = "";
        records.forEach((record) => {
            jsonData += record.get(0);
        });
        fs_1.default.writeFileSync(filePath, jsonData);
        console.log(`Backup for ${databaseName} created successfully: ${filePath}`);
    }
    catch (error) {
        console.error(`Error creating backup for ${databaseName}:`, error);
        throw error;
    }
    finally {
        await session.close();
    }
};
const createNeo4jBackup = async (previousDate, append) => {
    try {
        await exportDatabase(neo4j_1.ledgerSpaceDriver, "ledgerSpace_dev", previousDate, append);
        await exportDatabase(neo4j_1.searchSpaceDriver, "searchSpace_dev", previousDate, append);
        console.log("Both databases backed up successfully.");
    }
    catch (error) {
        console.error("Error creating backups:", error);
        throw error;
    }
};
exports.createNeo4jBackup = createNeo4jBackup;
//# sourceMappingURL=DBbackup.js.map