"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSpaceDriver = exports.ledgerSpaceDriver = void 0;
const neo4j = __importStar(require("neo4j-driver"));
require("dotenv").config();
const ledgerSpace_url = `${process.env.NEO_4J_LEDGER_SPACE_BOLT_URL}`;
const ledgerSpace_user = `${process.env.NEO_4J_LEDGER_SPACE_USER}`;
const ledgerSpace_password = `${process.env.NEO_4J_LEDGER_SPACE_PASS}`;
const searchSpace_url = `${process.env.NEO_4J_SEARCH_SPACE_BOLT_URL}`;
const searchSpace_user = `${process.env.NEO_4J_SEARCH_SPACE_USER}`;
const searchSpace_password = `${process.env.NEO_4J_SEARCH_SPACE_PASS}`;
const createDriverWithRetry = (url, user, password) => {
    const driver = neo4j.driver(url, neo4j.auth.basic(user, password), {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 30000,
        maxTransactionRetryTime: 30000,
    });
    // Verify connectivity on first use
    driver.verifyConnectivity()
        .then(() => console.log(`Successfully connected to Neo4j at ${url}`))
        .catch(error => console.error(`Failed to connect to Neo4j at ${url}:`, error));
    return driver;
};
exports.ledgerSpaceDriver = createDriverWithRetry(ledgerSpace_url, ledgerSpace_user, ledgerSpace_password);
exports.searchSpaceDriver = createDriverWithRetry(searchSpace_url, searchSpace_user, searchSpace_password);
// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Closing Neo4j drivers...');
    Promise.all([exports.ledgerSpaceDriver.close(), exports.searchSpaceDriver.close()])
        .then(() => {
        console.log('Neo4j drivers closed.');
        process.exit(0);
    })
        .catch(error => {
        console.error('Error closing Neo4j drivers:', error);
        process.exit(1);
    });
});
//# sourceMappingURL=neo4j.js.map