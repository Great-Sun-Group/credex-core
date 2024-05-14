import express from "express";
import { apiVersionOneRoute } from "../..";
import { CreateMemberController } from "../controllers/CreateMemberController";
import { GetSingleMemberController } from "../controllers/GetSingleMemberController";
import { GetMembersController } from "../controllers/GetMembersController";
import { UpdateMemberController } from "../controllers/UpdateMemberController";

export default function MembersRoutes(
  app: express.Application,
  jsonParser: any
) {

  app.post(
    `${apiVersionOneRoute}createMember`,
    jsonParser,
    CreateMemberController
  );

  // List view endpoint 
app.get(
  `${apiVersionOneRoute}members`,
  GetMembersController
)

  app.get(
    `${apiVersionOneRoute}member/:id`,  
    GetSingleMemberController 
  )
    
  app.patch(
    `${apiVersionOneRoute}updateMember`,
    jsonParser,
    UpdateMemberController
  );
}
