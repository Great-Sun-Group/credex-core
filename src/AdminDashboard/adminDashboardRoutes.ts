import express from "express"
import { apiVersionOneRoute } from ".."
import { authMiddleware } from "./middleware/authMiddleware";
import { getCredexDetails } from "./controllers/CredexController";
import { getMemberDetails, updateMemberTier } from "./controllers/MemberController";
import { getAccountDetails, getReceivedCredexOffers, getSentCredexOffers } from "./controllers/AccountController";
/*
function logRoute(req: express.Request, res: express.Response, next: express.NextFunction) {
  console.log("getCredexDetails route hit");
  next();
}
*/


export default function AdminDashboardRoutes(app: express.Application, jsonParser:any){
  app.get(`${apiVersionOneRoute}getCredexDetails`,
    //logRoute,
    jsonParser,     
    getCredexDetails
  );

  app.get(`${apiVersionOneRoute}getMemberDetails`,
    jsonParser,      
    getMemberDetails
  );

  
  app.put(`${apiVersionOneRoute}updateMemberTier`,
    jsonParser,    
    updateMemberTier
  );

  app.get(`${apiVersionOneRoute}getAccountDetails`,
    jsonParser,     
    getAccountDetails
  );

  app.get(`${apiVersionOneRoute}getReceivedCredexOffers`,
    jsonParser,      
    getReceivedCredexOffers
  );

  app.get(`${apiVersionOneRoute}getSentCredexOffers`,
    jsonParser,    
    getSentCredexOffers
  );

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