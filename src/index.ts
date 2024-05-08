import express from "express";
import WhatsAppClientRoutes from "./WhatsAppClient/routes";
import MembersRoutes from "./Members/routes";
import { Logger } from "./config/logger";
import bodyParser from "body-parser";

const app = express();
const port = 5000;

const jsonParser = bodyParser.json();

const urlencodedParser = bodyParser.urlencoded({ extended: false });

export const apiVersionOneRoute = "/api/v1/";

app.use(Logger);

WhatsAppClientRoutes(app, jsonParser);
MembersRoutes(app, jsonParser);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
