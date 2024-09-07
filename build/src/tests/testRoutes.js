"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestRoutes;
const __1 = require("..");
const clearDevDb_1 = require("./controllers/clearDevDb");
const forceDCO_1 = require("./controllers/forceDCO");
const forceMTQ_1 = require("./controllers/forceMTQ");
const offerAndAcceptCredex_1 = require("./controllers/offerAndAcceptCredex");
const createTestMembersAndAccounts_1 = require("./controllers/createTestMembersAndAccounts");
const createRandomFloatingCredexes_1 = require("./controllers/createRandomFloatingCredexes");
const createTestLoop_1 = require("./controllers/createTestLoop");
const growthTest_1 = require("./controllers/growthTest");
const checkLedgerVsSearchBalances_1 = require("./controllers/checkLedgerVsSearchBalances");
function TestRoutes(app, jsonParser) {
    app.delete(`${__1.apiVersionOneRoute}clearDevDB`, jsonParser, clearDevDb_1.ClearDevDbController);
    app.post(`${__1.apiVersionOneRoute}forceDCO`, jsonParser, forceDCO_1.ForceDcoController);
    app.post(`${__1.apiVersionOneRoute}forceMTQ`, jsonParser, forceMTQ_1.ForceMtqController);
    app.post(`${__1.apiVersionOneRoute}offerAndAcceptCredex`, jsonParser, offerAndAcceptCredex_1.OfferAndAcceptCredexController);
    app.post(`${__1.apiVersionOneRoute}createTestMembersAndAccounts`, jsonParser, createTestMembersAndAccounts_1.CreateTestMembersAndAccountsController);
    app.post(`${__1.apiVersionOneRoute}createRandomFloatingCredexes`, jsonParser, createRandomFloatingCredexes_1.CreateRandomFloatingCredexesController);
    app.post(`${__1.apiVersionOneRoute}createTestLoop`, jsonParser, createTestLoop_1.CreateTestLoopController);
    app.post(`${__1.apiVersionOneRoute}growthTest`, jsonParser, growthTest_1.GrowthTestController);
    app.get(`${__1.apiVersionOneRoute}checkLedgerVsSearchBalances`, jsonParser, checkLedgerVsSearchBalances_1.CheckLedgerVsSearchBalancesController);
}
//# sourceMappingURL=testRoutes.js.map