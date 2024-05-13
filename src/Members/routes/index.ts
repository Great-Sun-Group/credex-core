import express from "express";
import { apiVersionOneRoute } from "../..";
import { CreateMemberController } from "../controllers/CreateMemberController";
import UpdateMemberController from "../controllers/UpdateMemberController";

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
  app.patch(
    `${apiVersionOneRoute}updateMember`,
    jsonParser,
    UpdateMemberController
  );
}
