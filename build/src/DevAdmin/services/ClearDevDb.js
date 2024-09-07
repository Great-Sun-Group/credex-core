"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClearDevDbService = ClearDevDbService;
const neo4j_1 = require("../../../config/neo4j");
async function ClearDevDbService() {
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    const searchSpaceSession = neo4j_1.searchSpaceDriver.session();
    await ledgerSpaceSession.run(`
      MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r
      `);
    await searchSpaceSession.run(`
      MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r
      `);
    await ledgerSpaceSession.close();
    await searchSpaceSession.close();
    //check success first
    console.log("LedgerSpace and SearchSpace DBs cleared");
    return true;
}
//# sourceMappingURL=ClearDevDb.js.map