import express from "express";
import { apiVersionOneRoute } from "../../index";
import { getCredexDetails } from "./controllers/CredexController";
import {
  getMemberDetails,
  updateMemberTier,
} from "./controllers/MemberController";
import {
  getAccountDetails,
  getReceivedCredexOffers,
  getSentCredexOffers,
} from "./controllers/AccountController";
import { errorHandler } from "../../../middleware/errorHandler";

// Define route constants
const ROUTES = {
  GET_CREDEX_DETAILS: `${apiVersionOneRoute}getCredexDetails`,
  GET_MEMBER_DETAILS: `${apiVersionOneRoute}getMemberDetails`,
  UPDATE_MEMBER_TIER: `${apiVersionOneRoute}updateMemberTier`,
  GET_ACCOUNT_DETAILS: `${apiVersionOneRoute}getAccountDetails`,
  GET_RECEIVED_CREDEX_OFFERS: `${apiVersionOneRoute}getReceivedCredexOffers`,
  GET_SENT_CREDEX_OFFERS: `${apiVersionOneRoute}getSentCredexOffers`,
};

export default function AdminDashboardRoutes(
  app: express.Application,
  jsonParser: express.RequestHandler
) {
  app.get(
    ROUTES.GET_CREDEX_DETAILS,
    jsonParser,
    getCredexDetails
  );

  app.get(
    ROUTES.GET_MEMBER_DETAILS,
    jsonParser,
    getMemberDetails
  );

  app.patch(
    ROUTES.UPDATE_MEMBER_TIER,
    jsonParser,
    updateMemberTier
  );

  app.get(
    ROUTES.GET_ACCOUNT_DETAILS,
    jsonParser,
    getAccountDetails
  );

  app.get(
    ROUTES.GET_RECEIVED_CREDEX_OFFERS,
    jsonParser,
    getReceivedCredexOffers
  );

  app.get(
    ROUTES.GET_SENT_CREDEX_OFFERS,
    jsonParser,
    getSentCredexOffers
  );

  app.use(errorHandler);
}
