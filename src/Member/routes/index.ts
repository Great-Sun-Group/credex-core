import express from "express";
import { apiVersionOneRoute } from "../..";
import { CreateMemberController } from "../controllers/CreateMemberController";
import { CreateCompanyController } from "../controllers/CreateCompanyController";
import { AuthorizeForCompanyController } from "../controllers/AuthorizeForCompanyController";
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

  app.post(
    `${apiVersionOneRoute}createCompany`,
    jsonParser,
    CreateCompanyController
  );

  app.post(
    `${apiVersionOneRoute}authorizeForCompany`,
    jsonParser,
    AuthorizeForCompanyController
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
