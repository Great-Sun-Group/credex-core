import express from "express";
import { apiVersionOneRoute } from "../..";
import { CreateMemberController } from "../controllers/CreateMemberController";
import { GetMemberController } from "../controllers/GetMemberController";
import { GetMembersListController } from "../controllers/GetMembersListController";
import { UpdateMemberController } from "../controllers/UpdateMemberController";

export default function MemberRoutes(
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
  `${apiVersionOneRoute}memberslist`,
  GetMembersListController
)

  app.get(
    `${apiVersionOneRoute}member/:id`,  
    GetMemberController 
  )
    
  app.patch(
    `${apiVersionOneRoute}updateMember`,
    jsonParser,
    UpdateMemberController
  );
}
