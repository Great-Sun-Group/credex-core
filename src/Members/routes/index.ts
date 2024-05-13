import express from "express";
import { apiVersionOneRoute } from "../..";
import { CreateMemberController } from "../controllers/CreateMemberController";
import { GetSingleMemberController } from "../controllers/GetSingleMemberController";

export default function MembersRoutes(
  app: express.Application,
  jsonParser: any
) {
  /* 
    
    */
  app.post(
    `${apiVersionOneRoute}createMember`,
    jsonParser,
    CreateMemberController
  );

  // List view endpoint 
  app.get(
    `${apiVersionOneRoute}member/:id`,  
    GetSingleMemberController 
  );
}
