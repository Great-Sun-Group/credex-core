"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminDashboardRoutes;
const index_1 = require("../../index");
const CredexController_1 = require("./controllers/CredexController");
const MemberController_1 = require("./controllers/MemberController");
const AccountController_1 = require("./controllers/AccountController");
const errorHandler_1 = require("../../../middleware/errorHandler");
// Define route constants
const ROUTES = {
    GET_CREDEX_DETAILS: `${index_1.apiVersionOneRoute}getCredexDetails`,
    GET_MEMBER_DETAILS: `${index_1.apiVersionOneRoute}getMemberDetails`,
    UPDATE_MEMBER_TIER: `${index_1.apiVersionOneRoute}updateMemberTier`,
    GET_ACCOUNT_DETAILS: `${index_1.apiVersionOneRoute}getAccountDetails`,
    GET_RECEIVED_CREDEX_OFFERS: `${index_1.apiVersionOneRoute}getReceivedCredexOffers`,
    GET_SENT_CREDEX_OFFERS: `${index_1.apiVersionOneRoute}getSentCredexOffers`,
};
function AdminDashboardRoutes(app, jsonParser) {
    app.get(ROUTES.GET_CREDEX_DETAILS, jsonParser, CredexController_1.getCredexDetails);
    app.get(ROUTES.GET_MEMBER_DETAILS, jsonParser, MemberController_1.getMemberDetails);
    app.patch(ROUTES.UPDATE_MEMBER_TIER, jsonParser, MemberController_1.updateMemberTier);
    app.get(ROUTES.GET_ACCOUNT_DETAILS, jsonParser, AccountController_1.getAccountDetails);
    app.get(ROUTES.GET_RECEIVED_CREDEX_OFFERS, jsonParser, AccountController_1.getReceivedCredexOffers);
    app.get(ROUTES.GET_SENT_CREDEX_OFFERS, jsonParser, AccountController_1.getSentCredexOffers);
    app.use(errorHandler_1.errorHandler);
}
//# sourceMappingURL=adminDashboardRoutes.js.map