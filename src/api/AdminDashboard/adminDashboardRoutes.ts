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

export default function AdminDashboardRoutes(
  app: express.Application,
  jsonParser: any
) {
  app.get(
    `${apiVersionOneRoute}getCredexDetails`,
    jsonParser,
    getCredexDetails
  );

  app.get(
    `${apiVersionOneRoute}getMemberDetails`,
    jsonParser,
    getMemberDetails
  );

  app.patch(
    `${apiVersionOneRoute}updateMemberTier`,
    jsonParser,
    updateMemberTier
  );

  app.get(
    `${apiVersionOneRoute}getAccountDetails`,
    jsonParser,
    getAccountDetails
  );

  app.get(
    `${apiVersionOneRoute}getReceivedCredexOffers`,
    jsonParser,
    getReceivedCredexOffers
  );

  app.get(
    `${apiVersionOneRoute}getSentCredexOffers`,
    jsonParser,
    getSentCredexOffers
  );
}
