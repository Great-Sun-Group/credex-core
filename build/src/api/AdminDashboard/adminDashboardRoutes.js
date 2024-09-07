"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminDashboardRoutes;
const index_1 = require("../../index");
const CredexController_1 = require("./controllers/CredexController");
const MemberController_1 = require("./controllers/MemberController");
const AccountController_1 = require("./controllers/AccountController");
/*
function logRoute(req: express.Request, res: express.Response, next: express.NextFunction) {
  console.log("getCredexDetails route hit");
  next();
}
*/
function AdminDashboardRoutes(app, jsonParser) {
    app.get(`${index_1.apiVersionOneRoute}getCredexDetails`, 
    //logRoute,
    jsonParser, CredexController_1.getCredexDetails);
    app.get(`${index_1.apiVersionOneRoute}getMemberDetails`, jsonParser, MemberController_1.getMemberDetails);
    app.patch(`${index_1.apiVersionOneRoute}updateMemberTier`, jsonParser, MemberController_1.updateMemberTier);
    app.get(`${index_1.apiVersionOneRoute}getAccountDetails`, jsonParser, AccountController_1.getAccountDetails);
    app.get(`${index_1.apiVersionOneRoute}getReceivedCredexOffers`, jsonParser, AccountController_1.getReceivedCredexOffers);
    app.get(`${index_1.apiVersionOneRoute}getSentCredexOffers`, jsonParser, AccountController_1.getSentCredexOffers);
    /*
    app.get(`${apiVersionOneRoute}getAccountActivityLog`,
      jsonParser,
      authMiddleware,
      getAccountActivityLog
    );
    */
    /*
    app.put(`${apiVersionOneRoute}updateMemberStatus`,
      jsonParser,
      authMiddleware,
      updateMemberStatus
    );
    */
}
//# sourceMappingURL=adminDashboardRoutes.js.map