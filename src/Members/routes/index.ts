import express from "express";
import { apiVersionOneRoute } from "../..";
import { CreateMemberController } from "../controllers/CreateMemberController";

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
}
